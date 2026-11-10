// CORTA CUSTOMIZATION
// A server-safe identifier from a label the expert typed
// ("Agent Urbanisme & PLU" → "agent-urbanisme-plu"): lowercase letters,
// digits and dashes, starting with a letter or digit.

export function toSlug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
}
