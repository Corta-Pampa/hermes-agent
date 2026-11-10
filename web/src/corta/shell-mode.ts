// CORTA CUSTOMIZATION
// Which interface the dashboard mounts. Clients always get the Corta interface;
// the upstream dashboard (full configuration surface, upstream branding) stays
// reachable for the integrator who deploys Corta, through an address only they
// are given: `?interface=avancee` switches this browser to it and
// `?interface=simple` switches back. Nothing in the Corta interface links to it.

export type Shell = "corta" | "advanced";

export const SHELL_STORAGE_KEY = "corta.web.interface";
export const SHELL_QUERY_PARAM = "interface";

const ADVANCED_VALUES = new Set(["avancee", "avancée", "advanced"]);
const SIMPLE_VALUES = new Set(["simple", "corta"]);

type ShellStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface ShellResolution {
  shell: Shell;
  /** The query string with the switch parameter removed, when one was present. */
  cleanedSearch: string | null;
}

function remember(storage: ShellStorage | null, shell: Shell): void {
  try {
    if (shell === "advanced") storage?.setItem(SHELL_STORAGE_KEY, "advanced");
    else storage?.removeItem(SHELL_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private window, blocked site data): the
    // switch then lasts for this page load only.
  }
}

function stored(storage: ShellStorage | null): Shell {
  try {
    return storage?.getItem(SHELL_STORAGE_KEY) === "advanced" ? "advanced" : "corta";
  } catch {
    return "corta";
  }
}

/** Resolve the interface for this load from the URL switch, then the remembered choice. */
export function resolveShell(search: string, storage: ShellStorage | null): ShellResolution {
  const params = new URLSearchParams(search);
  const raw = params.get(SHELL_QUERY_PARAM);

  if (raw === null) {
    return { shell: stored(storage), cleanedSearch: null };
  }

  params.delete(SHELL_QUERY_PARAM);
  const rest = params.toString();
  const cleanedSearch = rest ? `?${rest}` : "";
  const value = raw.trim().toLowerCase();

  if (ADVANCED_VALUES.has(value)) {
    remember(storage, "advanced");
    return { shell: "advanced", cleanedSearch };
  }

  if (SIMPLE_VALUES.has(value)) {
    remember(storage, "corta");
    return { shell: "corta", cleanedSearch };
  }

  return { shell: stored(storage), cleanedSearch };
}
