// CORTA CUSTOMIZATION
// Page entry (index.html). Mounts the Corta interface, or the upstream
// dashboard (src/main.tsx, byte-for-byte upstream) when the integrator asked for
// it — see shell-mode.ts. Each branch loads only its own code and styles, so the
// upstream design system never paints the Corta interface.

import { resolveShell } from "./shell-mode";

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function addReturnToCortaLink(): void {
  const link = document.createElement("a");
  link.href = "?interface=simple";
  link.textContent = "Revenir à l'interface Corta";
  link.setAttribute(
    "style",
    [
      "position:fixed",
      "right:12px",
      "bottom:12px",
      "z-index:2147483000",
      "padding:6px 12px",
      "border-radius:999px",
      "background:#0A0A16",
      "color:#E7EDF7",
      "font:500 12px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
      "text-decoration:none",
      "box-shadow:0 2px 8px rgba(0,0,0,.3)",
      "opacity:.85",
    ].join(";"),
  );
  document.body.append(link);
}

const { shell, cleanedSearch } = resolveShell(window.location.search, safeStorage());

if (cleanedSearch !== null) {
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${cleanedSearch}${window.location.hash}`,
  );
}

if (shell === "advanced") {
  document.documentElement.lang = "en";
  void import("../main").then(addReturnToCortaLink);
} else {
  void import("./mount");
}
