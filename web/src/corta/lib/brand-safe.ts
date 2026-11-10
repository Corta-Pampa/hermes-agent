// CORTA CUSTOMIZATION
// Server-side text (error messages, notices, built-in skill descriptions) names
// the engine Corta runs on. Before such text reaches a Corta screen, the engine
// and its publisher are renamed to Corta. Conversation content written by the
// user or the assistant is never passed through here.

const RULES: ReadonlyArray<[RegExp, string]> = [
  [/\bhermes[\s_-]*agent\b/gi, "Corta"],
  [/\bnous[\s_-]*research\b/gi, "Corta"],
  [/\bnous[\s_-]*portal\b/gi, "le service d'IA"],
  [/\bhermes[\s_-]*cloud\b/gi, "le service d'IA"],
  [/\bhermes\b/gi, "Corta"],
];

export function brandSafe(text: string): string {
  let out = text;
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}

/** A readable message for any thrown value, renamed for Corta screens. */
export function errorText(error: unknown, fallback = "Une erreur est survenue."): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const trimmed = raw.trim();
  return trimmed ? brandSafe(trimmed) : fallback;
}
