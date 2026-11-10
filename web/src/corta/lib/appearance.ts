// CORTA CUSTOMIZATION
// Light / dark / follow-the-system, a per-browser convenience (localStorage).
// The resolved mode lands on <html data-theme>, which corta.css reads.

import { useSyncExternalStore } from "react";

export type Appearance = "system" | "light" | "dark";

const KEY = "corta.web.appearance";
const listeners = new Set<() => void>();

function readStored(): Appearance {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

let current: Appearance = typeof window === "undefined" ? "system" : readStored();
let snapshot: { appearance: Appearance; theme: "light" | "dark" } = { appearance: current, theme: "light" };

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolvedTheme(appearance: Appearance): "light" | "dark" {
  if (appearance === "system") return systemPrefersDark() ? "dark" : "light";
  return appearance;
}

function paint(): void {
  const theme = resolvedTheme(current);
  snapshot = { appearance: current, theme };
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0A0A16" : "#E7EDF7");
}

/** Paint the stored appearance and follow system changes. Call once, before the first render. */
export function installAppearance(): void {
  paint();
  if (typeof window.matchMedia === "function") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (current === "system") {
        paint();
        listeners.forEach((listener) => listener());
      }
    });
  }
}

export function setAppearance(next: Appearance): void {
  current = next;
  try {
    if (next === "system") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, next);
  } catch {
    // Not persisted in this browser; still applied for this visit.
  }
  paint();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppearance(): { appearance: Appearance; theme: "light" | "dark" } {
  return useSyncExternalStore(subscribe, () => snapshot);
}
