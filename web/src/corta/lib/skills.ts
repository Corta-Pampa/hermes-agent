// CORTA CUSTOMIZATION
// Skills ("compétences"): working methods an agent applies when a request
// calls for them. The expert writes one as a name, when to use it and how;
// this module turns that into the SKILL.md the server stores, and back.

import { brandSafe } from "./brand-safe";
import { toSlug } from "./slug";

/** Skills the expert creates from Corta live in this category. */
export const FIRM_CATEGORY = "cabinet";

/** The server keeps a skill's description to the width of its skill index (agent/skill_utils.py). */
export const SKILL_DESCRIPTION_MAX = 60;

export interface SkillDraft {
  label: string;
  whenToUse: string;
  howTo: string;
}

/** Skills about the engine itself are never listed on a Corta screen. */
export function isEngineSkill(name: string): boolean {
  return /hermes|nous/i.test(name);
}

export function skillSlug(label: string): string {
  return toSlug(label);
}

/** "plan-de-masse_v2" → "Plan de masse v2". */
export function skillLabel(name: string): string {
  const words = name.replace(/[-_.]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name;
}

export function skillDescription(description: string): string {
  return brandSafe(description.trim());
}

export function buildSkillMarkdown(draft: SkillDraft): string {
  const name = skillSlug(draft.label);
  const sentence = draft.whenToUse.trim().replace(/\s+/g, " ");
  // One sentence ending with a period, as the skill index expects, when it fits.
  const description = /[.!?…]$/.test(sentence) || sentence.length >= SKILL_DESCRIPTION_MAX ? sentence : `${sentence}.`;
  return [
    "---",
    `name: ${name}`,
    `description: ${JSON.stringify(description)}`,
    "---",
    "",
    `# ${draft.label.trim()}`,
    "",
    draft.howTo.trim(),
    "",
  ].join("\n");
}

/** The parts of a SKILL.md the Corta editor shows. */
export function readSkillMarkdown(content: string): { whenToUse: string; howTo: string; title: string | null } {
  const text = content.replace(/^\uFEFF/, "");
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text);
  const front = match?.[1] ?? "";
  let body = match ? text.slice(match[0].length) : text;

  let whenToUse = "";
  const line = /^description:\s*(.*)$/m.exec(front)?.[1]?.trim() ?? "";
  if (line.startsWith('"')) {
    try {
      whenToUse = JSON.parse(line) as string;
    } catch {
      whenToUse = line.replace(/^"|"$/g, "");
    }
  } else {
    whenToUse = line.replace(/^'|'$/g, "");
  }

  let title: string | null = null;
  const heading = /^\s*#\s+(.+)\n?/.exec(body);
  if (heading) {
    title = heading[1].trim();
    body = body.slice(heading[0].length);
  }
  return { whenToUse, howTo: body.trim(), title };
}
