import { describe, expect, it } from "vitest";
import type { GatewayEvent, TranscriptMessage } from "@hermes/shared";

import {
  conversationReducer,
  EMPTY_CONVERSATION,
  type AssistantItem,
  type ConversationAction,
  type ConversationState,
} from "./conversation-model";

const ev = (type: string, payload: Record<string, unknown> = {}): ConversationAction => ({
  type: "event",
  event: { type, payload, session_id: "live" } as unknown as GatewayEvent,
});

function run(actions: ConversationAction[], start: ConversationState = EMPTY_CONVERSATION): ConversationState {
  return actions.reduce(conversationReducer, start);
}

function lastAssistant(state: ConversationState): AssistantItem {
  const item = state.items[state.items.length - 1];
  if (item?.kind !== "assistant") throw new Error(`expected an assistant item, got ${item?.kind}`);
  return item;
}

describe("conversation transcript", () => {
  it("groups a stored turn's assistant text and tool rows into one reply", () => {
    const messages: TranscriptMessage[] = [
      { role: "user", text: "Trouve les ventes récentes" },
      { role: "assistant", text: "" },
      { role: "tool", name: "web_search", tool_call_id: "c1", content: "{}" },
      { role: "assistant", text: "Voici les ventes." },
      { role: "user", text: "Merci" },
      { role: "assistant", text: "Avec plaisir." },
    ];
    const state = run([{ type: "hydrate", messages }]);

    expect(state.items.map((item) => item.kind)).toEqual(["user", "assistant", "user", "assistant"]);
    const first = state.items[1] as AssistantItem;
    expect(first.text).toBe("Voici les ventes.");
    expect(first.steps).toEqual([{ id: "c1", label: "Recherche sur le web", status: "done" }]);
    expect(state.busy).toBe(false);
  });

  it("hides hidden rows and shows a skill invocation as typed", () => {
    const scaffold =
      '[IMPORTANT: The user has invoked the "estimation" skill, indicating they want you to follow its instructions. The full skill content is loaded below.]\n\nbody';
    const state = run([
      {
        type: "hydrate",
        messages: [
          { role: "user", text: "secret", display_kind: "hidden" },
          { role: "user", text: scaffold },
        ],
      },
    ]);
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ kind: "user", text: "/estimation" });
  });

  it("restores a turn still running on the server", () => {
    const state = run([
      {
        type: "hydrate",
        messages: [{ role: "user", text: "Analyse la parcelle" }],
        running: true,
        inflight: { user: "Analyse la parcelle", assistant: "Je regarde", streaming: true },
      },
    ]);
    expect(state.busy).toBe(true);
    expect(state.items.map((item) => item.kind)).toEqual(["user", "assistant"]);
    expect(lastAssistant(state)).toMatchObject({ text: "Je regarde", streaming: true });
  });
});

describe("live turn", () => {
  it("streams a reply, its steps, and finishes it", () => {
    const state = run([
      { type: "send", text: "Bonjour" },
      ev("message.start"),
      ev("message.delta", { text: "Je cherche" }),
      ev("tool.start", { tool_id: "t1", name: "web_search" }),
      ev("tool.complete", { tool_id: "t1", name: "web_search" }),
      ev("message.delta", { text: "Voilà." }),
      ev("message.complete", { status: "complete", text: "ignored" }),
    ]);
    const reply = lastAssistant(state);
    expect(reply.text).toBe("Je cherche\n\nVoilà.");
    expect(reply.streaming).toBe(false);
    expect(reply.steps).toEqual([{ id: "t1", label: "Recherche sur le web", status: "done" }]);
    expect(state.busy).toBe(false);
  });

  it("drops a replayed chunk it already applied", () => {
    const state = run([
      { type: "send", text: "x" },
      ev("message.delta", { text: "Bonjour ", turn_id: "T", segment: 0, offset: 0 }),
      ev("message.delta", { text: "à vous", turn_id: "T", segment: 0, offset: 8 }),
      ev("message.delta", { text: "Bonjour à", turn_id: "T", segment: 0, offset: 0 }),
      ev("message.delta", { text: "à vous.", turn_id: "T", segment: 0, offset: 8 }),
    ]);
    expect(lastAssistant(state).text).toBe("Bonjour à vous.");
  });

  it("uses the final text when nothing streamed", () => {
    const state = run([{ type: "send", text: "x" }, ev("message.complete", { status: "complete", text: "Réponse" })]);
    expect(lastAssistant(state)).toMatchObject({ text: "Réponse", streaming: false });
  });

  it("marks an interrupted or failed turn and renames the engine in errors", () => {
    const stopped = run([{ type: "send", text: "x" }, ev("message.delta", { text: "a" }), ev("message.complete", { status: "interrupted" })]);
    expect(lastAssistant(stopped).outcome).toBe("interrupted");

    const failed = run([{ type: "send", text: "x" }, ev("message.complete", { status: "error", error: "Hermes provider down" })]);
    expect(lastAssistant(failed)).toMatchObject({ outcome: "error", error: "Corta provider down" });
    expect(failed.busy).toBe(false);
  });

  it("tracks delegated agents and never reopens a finished one", () => {
    const state = run([
      { type: "send", text: "x" },
      ev("subagent.spawn_requested", { subagent_id: "s1", goal: "Lire le PLU", task_index: 0, task_count: 1 }),
      ev("subagent.start", { subagent_id: "s1", goal: "Lire le PLU", task_index: 0, task_count: 1 }),
      ev("subagent.tool", { subagent_id: "s1", goal: "Lire le PLU", tool_name: "read_file", task_index: 0, task_count: 1 }),
      ev("subagent.complete", { subagent_id: "s1", goal: "Lire le PLU", status: "completed", summary: "Zone UB", task_index: 0, task_count: 1 }),
      ev("subagent.progress", { subagent_id: "s1", goal: "Lire le PLU", task_index: 0, task_count: 1 }),
    ]);
    expect(lastAssistant(state).delegations).toEqual([
      { id: "s1", goal: "Lire le PLU", status: "done", summary: "Zone UB", activity: "Lecture d'un document" },
    ]);
  });

  it("updates a delegated agent that finishes after the reply, in place", () => {
    const state = run([
      { type: "send", text: "x" },
      ev("subagent.start", { subagent_id: "s1", goal: "Lire le PLU", task_index: 0, task_count: 1 }),
      ev("message.complete", { status: "complete", text: "Lancé." }),
      ev("subagent.tool", { subagent_id: "s1", goal: "Lire le PLU", tool_name: "web_search", task_index: 0, task_count: 1 }),
      ev("subagent.complete", { subagent_id: "s1", goal: "Lire le PLU", status: "completed", summary: "Zone UB", task_index: 0, task_count: 1 }),
    ]);
    expect(state.items.map((item) => item.kind)).toEqual(["user", "assistant"]);
    expect(state.busy).toBe(false);
    expect(lastAssistant(state).delegations).toEqual([
      { id: "s1", goal: "Lire le PLU", status: "done", summary: "Zone UB", activity: "Recherche sur le web" },
    ]);
  });

  it("surfaces a session error as a notice and frees the composer", () => {
    const state = run([{ type: "send", text: "x" }, ev("error", { message: "Hermes could not start" })]);
    expect(state.busy).toBe(false);
    expect(state.items[state.items.length - 1]).toMatchObject({ kind: "notice", text: "Corta could not start" });
  });

  it("follows the automatic title", () => {
    expect(run([ev("session.title", { title: "Vente Dupont" })]).title).toBe("Vente Dupont");
  });
});
