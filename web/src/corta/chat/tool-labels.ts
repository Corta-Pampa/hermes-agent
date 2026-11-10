// CORTA CUSTOMIZATION
// What a tool call is doing, in words an expert reads at a glance. The raw
// tool name (`web_search`, `read_file`, …) never reaches the screen.

import { brandSafe } from "../lib/brand-safe";

interface LabelLike {
  text?: string | null;
}

const EXACT: Record<string, string> = {
  web_search: "Recherche sur le web",
  web_extract: "Lecture d'une page web",
  read_file: "Lecture d'un document",
  write_file: "Rédaction d'un document",
  patch: "Modification d'un document",
  search_files: "Recherche dans les documents",
  terminal: "Opération sur le serveur",
  process_manage: "Suivi d'une opération en cours",
  execute_code: "Calcul et traitement de données",
  vision_analyze: "Analyse d'une image",
  image_generate: "Création d'une image",
  skills_list: "Consultation des compétences",
  skill_view: "Lecture d'une compétence",
  skill_manage: "Mise à jour d'une compétence",
  text_to_speech: "Synthèse vocale",
  todo_list: "Organisation des étapes",
  todo: "Organisation des étapes",
  memory: "Mise en mémoire",
  session_search: "Recherche dans les conversations passées",
  clarify: "Question pour vous",
  delegate_task: "Délégation à un agent",
  cronjob_manage: "Programmation d'une automatisation",
  cronjob: "Programmation d'une automatisation",
  computer_use: "Utilisation de l'ordinateur",
  manage_connections: "Gestion des connexions",
  send_message: "Envoi d'un message",
};

const PREFIXES: ReadonlyArray<[string, string]> = [
  ["browser_", "Navigation sur un site web"],
  ["kanban_", "Mise à jour du tableau des tâches"],
  ["feishu_", "Consultation de documents partagés"],
];

function humanizeName(name: string): string {
  const words = name
    .replace(/^mcp[_-]+/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Action";
}

/** The label shown for one tool call. */
export function toolLabel(name: string, labels?: ReadonlyArray<LabelLike> | null): string {
  if (EXACT[name]) return EXACT[name];
  for (const [prefix, label] of PREFIXES) {
    if (name.startsWith(prefix)) return label;
  }
  const described = labels?.find((label) => typeof label.text === "string" && label.text.trim())?.text;
  if (described) return brandSafe(described.trim());
  return `Action : ${brandSafe(humanizeName(name))}`;
}
