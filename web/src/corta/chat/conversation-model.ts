// CORTA CUSTOMIZATION
// One conversation as the Corta chat shows it, built from the gateway's
// transcript (session.resume) and its live events. Pure: no I/O, so every
// rule here is covered by conversation-model.test.ts.
//
// A turn renders as one assistant item: the reply text, the steps the agent
// took (tool calls, in plain words) and the agents it delegated work to.

import { skillInvocationText } from "@hermes/shared";
import type { GatewayEvent, InflightTurn, TranscriptMessage } from "@hermes/shared";

import { brandSafe } from "../lib/brand-safe";
import { toolLabel } from "./tool-labels";

export type StepStatus = "running" | "done";

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export type DelegationStatus = "pending" | "running" | "done" | "failed";

export interface Delegation {
  id: string;
  goal: string;
  status: DelegationStatus;
  summary?: string;
  activity?: string;
}

export interface UserItem {
  kind: "user";
  id: string;
  text: string;
}

export interface AssistantItem {
  kind: "assistant";
  id: string;
  text: string;
  streaming: boolean;
  steps: Step[];
  delegations: Delegation[];
  outcome?: "interrupted" | "error";
  error?: string;
}

export interface NoticeItem {
  kind: "notice";
  id: string;
  text: string;
}

export type ChatItem = UserItem | AssistantItem | NoticeItem;

export interface ConversationState {
  items: ChatItem[];
  busy: boolean;
  /** A short status the agent reported (context compaction), or null. */
  status: string | null;
  title: string | null;
  /** Streaming segment bookkeeping for offset de-duplication. */
  segment: { key: string; length: number } | null;
  /** The next appended text starts a new paragraph (after a tool call / interim seal). */
  pendingBreak: boolean;
  nextId: number;
}

export type ConversationAction =
  | {
      type: "hydrate";
      messages: readonly TranscriptMessage[];
      running?: boolean | null;
      inflight?: InflightTurn | null;
      title?: string | null;
    }
  | { type: "send"; text: string }
  | { type: "send.failed"; error: string }
  | { type: "event"; event: GatewayEvent };

export const EMPTY_CONVERSATION: ConversationState = {
  items: [],
  busy: false,
  status: null,
  title: null,
  segment: null,
  pendingBreak: false,
  nextId: 1,
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");

function messageText(message: TranscriptMessage): string {
  if (typeof message.text === "string") return message.text;
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""))
      .join("");
  }
  return "";
}

function userText(text: string): string {
  return skillInvocationText(text) ?? text;
}

function joinParagraph(current: string, addition: string): string {
  if (!current.trim()) return addition;
  if (!addition) return current;
  return `${current.replace(/\s+$/, "")}\n\n${addition.replace(/^\s+/, "")}`;
}

function newAssistant(id: string, streaming: boolean): AssistantItem {
  return { kind: "assistant", id, text: "", streaming, steps: [], delegations: [] };
}

/** Immutable helper: the state with its tail assistant item replaced (created when absent). */
function withTail(state: ConversationState, update: (item: AssistantItem) => AssistantItem): ConversationState {
  const last = state.items[state.items.length - 1];
  if (last?.kind === "assistant" && last.streaming) {
    return { ...state, items: [...state.items.slice(0, -1), update(last)] };
  }
  const id = `a${state.nextId}`;
  return {
    ...state,
    nextId: state.nextId + 1,
    segment: null,
    pendingBreak: false,
    items: [...state.items, update(newAssistant(id, true))],
  };
}

function hydrate(action: Extract<ConversationAction, { type: "hydrate" }>): ConversationState {
  let nextId = 1;
  const items: ChatItem[] = [];
  let turn: AssistantItem | null = null;

  const tail = (): AssistantItem => {
    if (!turn) {
      turn = newAssistant(`a${nextId++}`, false);
      items.push(turn);
    }
    return turn;
  };

  for (const message of action.messages) {
    if (message.display_kind === "hidden") continue;
    const text = messageText(message);

    if (message.role === "user") {
      if (!text.trim()) continue;
      turn = null;
      items.push({ kind: "user", id: `u${nextId++}`, text: userText(text) });
    } else if (message.role === "assistant") {
      const item = tail();
      item.text = joinParagraph(item.text, text);
    } else if (message.role === "tool") {
      const item = tail();
      const name = str(message.name) || "tool";
      item.steps.push({
        id: str(message.tool_call_id) || `t${nextId++}`,
        label: toolLabel(name, message.labels),
        status: "done",
      });
    }
  }

  const inflight = action.inflight;
  let busy = Boolean(action.running);
  if (inflight && (action.running || inflight.streaming)) {
    const pendingUser = str(inflight.user).trim();
    const lastUser = [...items].reverse().find((item) => item.kind === "user");
    if (pendingUser && (!lastUser || lastUser.text !== userText(pendingUser))) {
      items.push({ kind: "user", id: `u${nextId++}`, text: userText(pendingUser) });
    }
    const item = newAssistant(`a${nextId++}`, true);
    item.text = str(inflight.assistant);
    items.push(item);
    busy = true;
  }

  return { ...EMPTY_CONVERSATION, items, busy, title: action.title ?? null, nextId };
}

function appendText(state: ConversationState, text: string, key: string | null, offset: number | null): ConversationState {
  let chunk = text;
  let segment = state.segment;

  if (key !== null && offset !== null) {
    if (!segment || segment.key !== key) {
      segment = { key, length: 0 };
    }
    // A chunk re-sent after a reconnect replay overlaps what was applied.
    if (offset + chunk.length <= segment.length) return state;
    if (offset < segment.length) chunk = chunk.slice(segment.length - offset);
    segment = { key, length: Math.max(segment.length, offset) + chunk.length };
  }

  const pendingBreak = state.pendingBreak;
  const next = withTail(state, (item) => ({
    ...item,
    text: pendingBreak ? joinParagraph(item.text, chunk) : item.text + chunk,
  }));
  return { ...next, segment, pendingBreak: false, busy: true };
}

function upsertStep(state: ConversationState, step: Step): ConversationState {
  const next = withTail(state, (item) => {
    const index = item.steps.findIndex((existing) => existing.id === step.id);
    const steps =
      index >= 0
        ? item.steps.map((existing, i) => (i === index ? { ...existing, ...step, label: existing.label || step.label } : existing))
        : [...item.steps, step];
    return { ...item, steps };
  });
  return { ...next, busy: true, pendingBreak: true };
}

const DELEGATION_STATUS: Record<string, DelegationStatus> = {
  queued: "pending",
  running: "running",
  completed: "done",
  failed: "failed",
  error: "failed",
  timeout: "failed",
  interrupted: "failed",
};

function upsertDelegation(state: ConversationState, event: GatewayEvent): ConversationState {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const goal = brandSafe(str(payload.goal).trim()) || "Mission déléguée";
  const id = str(payload.subagent_id) || `${String(payload.task_index ?? 0)}:${goal}`;
  let status: DelegationStatus;
  if (event.type === "subagent.spawn_requested") status = "pending";
  else if (event.type === "subagent.complete") status = DELEGATION_STATUS[str(payload.status)] ?? "done";
  else status = "running";

  const summary = event.type === "subagent.complete" ? str(payload.summary).trim() || undefined : undefined;
  const toolName = str(payload.tool_name);
  const activity = event.type === "subagent.tool" && toolName ? toolLabel(toolName) : undefined;

  const merge = (item: AssistantItem): AssistantItem => {
    const index = item.delegations.findIndex((delegation) => delegation.id === id);
    if (index < 0) {
      return { ...item, delegations: [...item.delegations, { id, goal, status, summary, activity }] };
    }
    const delegations = item.delegations.map((delegation, i) => {
      if (i !== index) return delegation;
      // A late progress frame never reopens a finished delegation.
      const finished = delegation.status === "done" || delegation.status === "failed";
      return {
        ...delegation,
        status: finished && status !== "done" && status !== "failed" ? delegation.status : status,
        summary: summary ?? delegation.summary,
        activity: activity ?? delegation.activity,
      };
    });
    return { ...item, delegations };
  };

  // A delegated agent can keep working after the reply that launched it has
  // ended (asynchronous delegation): its later frames update the card where it
  // was shown, without reopening the turn.
  const owner = state.items.findLastIndex(
    (item) => item.kind === "assistant" && item.delegations.some((delegation) => delegation.id === id),
  );
  const tail = state.items[state.items.length - 1];
  const streamingTail = tail?.kind === "assistant" && tail.streaming;
  const target = owner >= 0 ? owner : streamingTail ? -1 : state.items.findLastIndex((item) => item.kind === "assistant");
  if (target >= 0) {
    const items = state.items.map((item, index) => (index === target && item.kind === "assistant" ? merge(item) : item));
    return { ...state, items };
  }
  return { ...withTail(state, merge), busy: true };
}

function finishTail(state: ConversationState, update: Partial<AssistantItem>): ConversationState {
  const last = state.items[state.items.length - 1];
  if (last?.kind !== "assistant" || !last.streaming) {
    if (!update.text && !update.outcome) return { ...state, busy: false, status: null };
    const id = `a${state.nextId}`;
    return {
      ...state,
      busy: false,
      status: null,
      nextId: state.nextId + 1,
      items: [...state.items, { ...newAssistant(id, false), ...update, streaming: false }],
    };
  }
  const finished: AssistantItem = {
    ...last,
    ...update,
    text: last.text.trim() ? last.text : update.text ?? last.text,
    streaming: false,
    steps: last.steps.map((step) => (step.status === "running" ? { ...step, status: "done" } : step)),
  };
  return {
    ...state,
    busy: false,
    status: null,
    segment: null,
    pendingBreak: false,
    items: [...state.items.slice(0, -1), finished],
  };
}

type Payload = Record<string, unknown>;
type EventHandler = (state: ConversationState, payload: Payload, event: GatewayEvent) => ConversationState;

const toolLabels = (payload: Payload) => payload.labels as ReadonlyArray<{ text?: string | null }> | null;

function onToolEdge(status: StepStatus): EventHandler {
  return (state, payload) => {
    const name = str(payload.name);
    // The question itself shows as a card; it is not a step.
    if (name === "clarify") return state;
    return upsertStep(state, { id: str(payload.tool_id) || `t${state.nextId}`, label: toolLabel(name, toolLabels(payload)), status });
  };
}

function onComplete(state: ConversationState, payload: Payload): ConversationState {
  const status = str(payload.status);
  const text = str(payload.text);
  if (status === "error") {
    const reason = str(payload.error) || str(payload.failure_reason) || str(payload.warning);
    return finishTail(state, { text, outcome: "error", error: reason ? brandSafe(reason) : "La réponse n'a pas pu aboutir." });
  }
  if (status === "interrupted") return finishTail(state, { text, outcome: "interrupted" });
  return finishTail(state, { text });
}

function onSessionError(state: ConversationState, payload: Payload): ConversationState {
  const message = brandSafe(str(payload.message).trim() || "Une erreur est survenue.");
  const finished = state.busy ? finishTail(state, {}) : state;
  return {
    ...finished,
    busy: false,
    nextId: finished.nextId + 1,
    items: [...finished.items, { kind: "notice", id: `n${finished.nextId}`, text: message }],
  };
}

const onDelegation: EventHandler = (state, _payload, event) => upsertDelegation(state, event);

const EVENT_HANDLERS: Partial<Record<string, EventHandler>> = {
  "message.start": (state) => ({ ...withTail(state, (item) => item), busy: true }),
  "message.delta": (state, payload) => {
    const text = payload.text;
    if (typeof text !== "string" || !text) return state;
    const turn = str(payload.turn_id);
    const key = turn ? `${turn}:${String(payload.segment ?? 0)}` : null;
    const offset = typeof payload.offset === "number" ? payload.offset : null;
    return appendText(state, text, key, offset);
  },
  "message.interim": (state, payload) => {
    const text = str(payload.text);
    const base = payload.already_streamed === true || !text ? state : appendText(state, text, null, null);
    return { ...withTail(base, (item) => item), pendingBreak: true, segment: null };
  },
  "tool.start": onToolEdge("running"),
  "tool.complete": onToolEdge("done"),
  "tool.progress": (state, payload) => {
    const message = str(payload.message).trim();
    const percent = typeof payload.percent === "number" ? `${Math.round(payload.percent)} %` : "";
    return upsertStep(state, {
      id: str(payload.tool_id),
      label: toolLabel(str(payload.name)),
      status: "running",
      detail: brandSafe([message, percent].filter(Boolean).join(" · ")) || undefined,
    });
  },
  "subagent.spawn_requested": onDelegation,
  "subagent.start": onDelegation,
  "subagent.progress": onDelegation,
  "subagent.tool": onDelegation,
  "subagent.complete": onDelegation,
  "status.update": (state, payload) =>
    str(payload.kind) === "compacting" ? { ...state, status: "Je résume notre échange pour garder le fil…" } : state,
  "message.complete": onComplete,
  error: onSessionError,
  "session.title": (state, payload) => {
    const title = str(payload.title).trim();
    return title ? { ...state, title } : state;
  },
};

function onEvent(state: ConversationState, event: GatewayEvent): ConversationState {
  const handler = EVENT_HANDLERS[event.type];
  return handler ? handler(state, (event.payload ?? {}) as Payload, event) : state;
}

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case "hydrate":
      return hydrate(action);
    case "send":
      return {
        ...state,
        busy: true,
        status: null,
        segment: null,
        pendingBreak: false,
        nextId: state.nextId + 1,
        items: [...state.items, { kind: "user", id: `u${state.nextId}`, text: action.text }],
      };
    case "send.failed":
      return {
        ...state,
        busy: false,
        nextId: state.nextId + 1,
        items: [...state.items, { kind: "notice", id: `n${state.nextId}`, text: brandSafe(action.error) }],
      };
    case "event":
      return onEvent(state, action.event);
  }
}
