// CORTA CUSTOMIZATION
// "Agents" are the server's profiles: each has its own instructions (SOUL.md),
// memory, skills and history. The main profile is shown as the main assistant.
// An agent's display name is the one Corta Desktop's agents roster uses
// (profile.yaml ui_meta["hermes-bots"].title), so both apps name it alike.

import { useEffect, useSyncExternalStore } from "react";

import { chatStore } from "../chat/chat-store";
import { brandSafe, errorText } from "./brand-safe";
import { toSlug } from "./slug";

export const ROSTER_META_KEY = "hermes-bots";
export const MAIN_ASSISTANT_LABEL = "Assistant principal";

export interface Agent {
  /** Profile name, the server-side identifier. */
  name: string;
  label: string;
  description: string;
  isDefault: boolean;
  skillCount: number;
}

/** One row of the gateway's `profiles.list`. */
export interface ProfileRow {
  name: string;
  is_default?: boolean;
  description?: string;
  display_name?: string;
  skill_count?: number;
  ui_meta?: Record<string, unknown>;
  ui_meta_revisions?: Record<string, number>;
}

/** "redaction-rapports" → "Redaction rapports". */
export function prettifyName(name: string): string {
  const words = name.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name;
}

export function rosterMeta(row: Pick<ProfileRow, "ui_meta">): Record<string, unknown> {
  const meta = row.ui_meta?.[ROSTER_META_KEY];
  return meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
}

export function toAgent(row: ProfileRow): Agent {
  const title = rosterMeta(row).title;
  const isDefault = Boolean(row.is_default);
  return {
    name: row.name,
    label: isDefault
      ? MAIN_ASSISTANT_LABEL
      : (typeof title === "string" && title.trim()) || row.display_name?.trim() || prettifyName(row.name),
    description: brandSafe(row.description?.trim() ?? ""),
    isDefault,
    skillCount: row.skill_count ?? 0,
  };
}

/** A valid profile name for a label the user typed. */
export const agentSlug = toSlug;

/** The profile parameter for an agent: none for the main assistant. */
export function agentParam(agent: Agent | undefined | null): string | null {
  return agent && !agent.isDefault ? agent.name : null;
}

interface AgentsSnapshot {
  agents: Agent[];
  rows: ProfileRow[];
  loading: boolean;
  error: string | null;
}

let snapshot: AgentsSnapshot = { agents: [], rows: [], loading: true, error: null };
let inflight: Promise<void> | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function set(next: AgentsSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export async function listProfiles(): Promise<ProfileRow[]> {
  await chatStore.whenReady();
  const result = await chatStore.client.request<{ profiles?: ProfileRow[] }>("profiles.list", { include_sessions: false });
  return Array.isArray(result?.profiles) ? result.profiles : [];
}

export function refreshAgents(): Promise<void> {
  if (inflight) return inflight;
  inflight = listProfiles()
    .then((rows) => {
      const agents = rows
        .map(toAgent)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label, "fr"));
      set({ agents, rows, loading: false, error: null });
    })
    .catch((error) => set({ ...snapshot, loading: false, error: errorText(error, "La liste des agents n'a pas pu être chargée.") }))
    .finally(() => {
      inflight = null;
      loaded = true;
    });
  return inflight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAgents(): AgentsSnapshot & { byName: (name: string | null) => Agent | undefined } {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => {
    if (!loaded) void refreshAgents();
  }, []);
  return {
    ...current,
    byName: (name) => (name ? current.agents.find((agent) => agent.name === name) : current.agents.find((agent) => agent.isDefault)),
  };
}

/** Instructions file for a new agent: who it is, then what the expert asked of it. */
export function agentSoul(label: string, instructions: string): string {
  const body = instructions.trim();
  const lines = [
    `Tu es « ${label} », un agent de Corta, l'assistant IA d'un cabinet d'expertise foncière.`,
    "Tu réponds en français, avec précision et sans jargon technique inutile.",
    "Tu te présentes uniquement comme un agent Corta : ne mentionne jamais le logiciel, le moteur ou l'éditeur sur lequel tu fonctionnes.",
    ...(body ? ["", "## Ta mission", "", body] : []),
  ];
  return `${lines.join("\n")}\n`;
}

/** Write an agent's display name the way Corta Desktop does: a CAS update of its roster entry. */
export async function saveAgentLabel(name: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = (await listProfiles()).find((profile) => profile.name === name);
    if (!row) throw new Error("Cet agent n'existe plus.");
    const revision = row.ui_meta_revisions?.[ROSTER_META_KEY] ?? 0;
    const result = await chatStore.client.request<{ applied?: { ui_meta?: boolean; ui_meta_conflicts?: unknown } }>(
      "profiles.configure",
      {
        name,
        ui_meta: { [ROSTER_META_KEY]: { ...rosterMeta(row), title: label } },
        ui_meta_expected_revisions: { [ROSTER_META_KEY]: revision },
      },
    );
    if (!result?.applied?.ui_meta_conflicts) return;
  }
  throw new Error("Le nom n'a pas pu être enregistré, réessayez.");
}
