// CORTA CUSTOMIZATION
// Recent conversations across every agent, newest first, for the sidebar.

import { useEffect, useState } from "react";

import { api, type SessionInfo } from "@/lib/api";

import type { Agent } from "../lib/agents";
import { useChatSelector } from "./chat-store";

// Sessions a person did not have: the upstream dashboard's sidecar, delegated
// children and kanban workers.
const HIDDEN_SOURCES = ["tool", "subagent", "kanban"];
const PER_AGENT = 40;
const SHOWN = 60;

export interface ConversationSummary {
  key: string;
  title: string;
  agent: string | null;
  agentLabel: string | null;
  lastActive: number;
  automated: boolean;
}

function summaryTitle(session: SessionInfo): string {
  const title = session.title?.trim();
  if (title) return title;
  const preview = session.preview?.replace(/\s+/g, " ").trim();
  if (preview) return preview.length > 60 ? `${preview.slice(0, 57)}…` : preview;
  return "Nouvelle discussion";
}

export function useConversations(agents: Agent[]): { conversations: ConversationSummary[]; loading: boolean } {
  const listVersion = useChatSelector((store) => store.listVersion);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const agentKey = agents.map((agent) => agent.name).join("|");

  useEffect(() => {
    if (!agents.length) return;
    let cancelled = false;
    Promise.allSettled(
      agents.map((agent) =>
        api
          .getSessions(PER_AGENT, 0, { profile: agent.name, order: "recent", excludeSources: HIDDEN_SOURCES }, "recent")
          .then(({ sessions }) =>
            sessions
              .filter((session) => session.message_count > 0)
              .map<ConversationSummary>((session) => ({
                key: session.id,
                title: summaryTitle(session),
                agent: agent.isDefault ? null : agent.name,
                agentLabel: agent.isDefault ? null : agent.label,
                lastActive: session.last_active || session.started_at,
                automated: session.source === "cron",
              })),
          ),
      ),
    ).then((results) => {
      if (cancelled) return;
      const merged = results
        .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        .sort((a, b) => b.lastActive - a.lastActive)
        .slice(0, SHOWN);
      setConversations(merged);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // agentKey stands for `agents`; listVersion refetches after a turn or a rename.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentKey, listVersion]);

  return { conversations, loading };
}
