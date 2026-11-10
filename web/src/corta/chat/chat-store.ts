// CORTA CUSTOMIZATION
// The Corta chat's connection to the agent: one gateway WebSocket (the same
// JSON-RPC protocol Corta Desktop speaks), the open conversations keyed by
// their stored session id, and the questions the agent is waiting on.
//
// Conversations are created with source "desktop", as Corta Desktop does, so
// the history is shared between the web interface and the desktop app.

import { useSyncExternalStore } from "react";
import type {
  ConnectionState,
  GatewayEvent,
  PromptSubmitResult,
  ServerRequest,
  SessionCreateResult,
  SessionResumeResult,
} from "@hermes/shared";

import { GatewayClient } from "@/lib/gatewayClient";

import { errorText } from "../lib/brand-safe";
import { conversationReducer, EMPTY_CONVERSATION, type ConversationAction, type ConversationState } from "./conversation-model";

const SESSION_SOURCE = "desktop";
const PROMPT_TIMEOUT_MS = 120_000;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000];

/** Server→client prompts the Corta chat answers; every other bridge is declined (-32601). */
export const ANSWERED_PROMPTS = new Set(["approval", "clarify", "sudo", "secret"]);

const NO_PROMPTS: readonly ServerRequest[] = [];

export interface ConversationEntry {
  /** Stored session id: the conversation's address (/c/:key). */
  key: string;
  liveId: string | null;
  /** Profile ("agent") the conversation runs on; null = the main assistant. */
  agent: string | null;
  state: ConversationState;
  loading: boolean;
  loadError: string | null;
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");

function profileParam(agent: string | null): Record<string, string> {
  return agent ? { profile: agent } : {};
}

function looksLikeLostSession(error: unknown): boolean {
  return /session|not found|unknown|expired|no such/i.test(errorText(error, ""));
}

export class ChatStore {
  readonly client = new GatewayClient();
  connection: ConnectionState = "idle";
  private entries = new Map<string, ConversationEntry>();
  private liveToKey = new Map<string, string>();
  private prompts = new Map<string, ServerRequest[]>();
  private listeners = new Set<() => void>();
  private started = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private waitingCache: { version: number; keys: ReadonlySet<string> } | null = null;
  /** Bumps when the stored conversation list may have changed. */
  listVersion = 0;
  version = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.client.onState((state) => {
      this.connection = state;
      if (state === "open") this.attempts = 0;
      if ((state === "closed" || state === "error") && !this.reconnectTimer) this.scheduleReconnect();
      this.emit();
    });
    this.client.onAny((event) => this.route(event));
    this.client.onRequest((request) => this.receivePrompt(request));
    void this.connect();
  }

  private scheduleReconnect(): void {
    const delay = RECONNECT_DELAYS_MS[Math.min(this.attempts, RECONNECT_DELAYS_MS.length - 1)];
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      if (!this.reconnectTimer) this.scheduleReconnect();
    }
  }

  async whenReady(): Promise<void> {
    if (this.connection === "open") return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error("Connexion au serveur impossible pour le moment."));
      }, 20_000);
      const off = this.client.onState((state) => {
        if (state === "open") {
          clearTimeout(timer);
          // onState calls back synchronously on subscribe; defer the unsubscribe.
          queueMicrotask(off);
          resolve();
        }
      });
    });
  }

  // ── conversations ──────────────────────────────────────────────────────

  get(key: string): ConversationEntry | undefined {
    return this.entries.get(key);
  }

  private put(entry: ConversationEntry): void {
    this.entries.set(entry.key, entry);
    if (entry.liveId) this.liveToKey.set(entry.liveId, entry.key);
    this.emit();
  }

  private dispatch(key: string, action: ConversationAction): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.put({ ...entry, state: conversationReducer(entry.state, action) });
  }

  private route(event: GatewayEvent): void {
    if (event.type === "sessions.changed") {
      this.listVersion += 1;
      this.emit();
      return;
    }
    if (event.type === "request.cancel") {
      this.dropPrompt(str((event.payload as { id?: unknown } | undefined)?.id));
      return;
    }
    const sid = event.session_id;
    if (!sid) return;
    if (event.type === "approval.cancelled") {
      const ids = new Set(((event.payload as { request_ids?: unknown[] } | undefined)?.request_ids ?? []).map(String));
      const kept = (this.prompts.get(sid) ?? []).filter(
        (request) => request.method !== "approval" || (ids.size > 0 && !ids.has(str(request.params.request_id))),
      );
      this.prompts.set(sid, kept);
      this.emit();
    }
    const key = this.liveToKey.get(sid);
    if (!key) return;
    this.dispatch(key, { type: "event", event });
    if (event.type === "message.complete" || event.type === "session.title") {
      this.listVersion += 1;
      this.emit();
    }
  }

  /** Attach to a stored conversation (no-op when it is already open here). */
  async open(key: string, agent: string | null): Promise<void> {
    const existing = this.entries.get(key);
    if (existing && (existing.liveId || existing.loading)) return;
    this.put({ key, agent, liveId: null, state: existing?.state ?? EMPTY_CONVERSATION, loading: true, loadError: null });
    try {
      await this.resume(key, agent);
    } catch (error) {
      const entry = this.entries.get(key);
      if (entry) this.put({ ...entry, loading: false, loadError: errorText(error, "Cette conversation n'a pas pu être ouverte.") });
    }
  }

  private async resume(key: string, agent: string | null): Promise<string> {
    await this.whenReady();
    const result = await this.client.request<SessionResumeResult>("session.resume", {
      session_id: key,
      source: SESSION_SOURCE,
      ...profileParam(agent),
    });
    const entry = this.entries.get(key);
    const state = conversationReducer(EMPTY_CONVERSATION, {
      type: "hydrate",
      messages: result.messages ?? [],
      running: result.running,
      inflight: result.inflight,
      title: entry?.state.title ?? null,
    });
    this.put({ key, agent, liveId: result.session_id, state, loading: false, loadError: null });
    return result.session_id;
  }

  /** Start a conversation with `agent` and send its first message; resolves to its key. */
  async startNew(agent: string | null, text: string): Promise<string> {
    await this.whenReady();
    const created = await this.client.request<SessionCreateResult>("session.create", {
      source: SESSION_SOURCE,
      ...profileParam(agent),
    });
    const key = created.stored_session_id || created.session_id;
    this.put({ key, agent, liveId: created.session_id, state: EMPTY_CONVERSATION, loading: false, loadError: null });
    void this.send(key, text);
    return key;
  }

  async send(key: string, text: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.dispatch(key, { type: "send", text });
    try {
      await this.whenReady();
      const liveId = entry.liveId ?? (await this.resume(key, entry.agent));
      try {
        await this.submit(liveId, text);
      } catch (error) {
        // The server may have restarted since this page attached: re-attach once and retry.
        if (!looksLikeLostSession(error)) throw error;
        const fresh = await this.resume(key, entry.agent);
        // The re-attach rebuilt the transcript from the server; show the message again.
        this.dispatch(key, { type: "send", text });
        await this.submit(fresh, text);
      }
      this.listVersion += 1;
      this.emit();
    } catch (error) {
      this.dispatch(key, { type: "send.failed", error: errorText(error, "Le message n'a pas pu être envoyé.") });
    }
  }

  private submit(liveId: string, text: string): Promise<PromptSubmitResult> {
    return this.client.request<PromptSubmitResult>("prompt.submit", { session_id: liveId, text }, PROMPT_TIMEOUT_MS);
  }

  async stop(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry?.liveId) return;
    try {
      await this.client.request("session.interrupt", { session_id: entry.liveId });
    } catch {
      // The turn may have just ended; the next event settles the view either way.
    }
  }

  // ── prompts the agent is waiting on ───────────────────────────────────

  private receivePrompt(request: ServerRequest): boolean {
    if (!ANSWERED_PROMPTS.has(request.method)) return false;
    if (request.method === "clarify" && !(Array.isArray(request.params.questions) && request.params.questions.length)) {
      // Nothing to ask: answer at once rather than leave the agent waiting.
      request.respond({});
      return true;
    }
    const sid = str(request.params.session_id);
    const list = (this.prompts.get(sid) ?? []).filter((existing) => existing.id !== request.id);
    this.prompts.set(sid, [...list, request]);
    this.emit();
    return true;
  }

  private dropPrompt(id: string): void {
    if (!id) return;
    for (const [sid, list] of this.prompts) {
      const kept = list.filter((request) => request.id !== id);
      if (kept.length !== list.length) this.prompts.set(sid, kept);
    }
    this.emit();
  }

  promptsFor(key: string): readonly ServerRequest[] {
    const liveId = this.entries.get(key)?.liveId;
    return (liveId && this.prompts.get(liveId)) || NO_PROMPTS;
  }

  /** Conversation keys with a question waiting, for the sidebar (stable between changes). */
  waitingKeys(): ReadonlySet<string> {
    if (this.waitingCache?.version !== this.version) {
      const keys = new Set<string>();
      for (const [sid, list] of this.prompts) {
        const key = this.liveToKey.get(sid);
        if (key && list.length) keys.add(key);
      }
      this.waitingCache = { version: this.version, keys };
    }
    return this.waitingCache.keys;
  }

  answer(request: ServerRequest, result: Record<string, unknown>): void {
    request.respond(result);
    this.dropPrompt(request.id);
  }
}

export const chatStore = new ChatStore();

/**
 * Subscribe to one immutable slice of the chat store. `select` must return a
 * value whose identity changes only when that slice changes (entries, prompt
 * lists and strings do): React Compiler memoizes reads keyed on their inputs,
 * so render code never reads the mutable store directly.
 */
export function useChatSelector<T>(select: (store: ChatStore) => T): T {
  return useSyncExternalStore(chatStore.subscribe, () => select(chatStore));
}
