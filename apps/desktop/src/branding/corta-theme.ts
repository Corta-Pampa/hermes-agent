// CORTA CUSTOMIZATION
// The Corta desktop theme, a native preset of the Hermes theme system
// (src/themes/types.ts → DesktopTheme). Every surface of the app paints from
// these slots: applyTheme (src/themes/context.tsx) derives the design-system
// variables (--dt-*, --theme-*, --ui-*) for backgrounds, cards, sidebar,
// popovers/menus/modals, borders, inputs, focus rings, buttons, bubbles,
// status colors and the integrated terminal. No global CSS override is used.
//
// ─── BRAND TOKENS: NOT SUPPLIED YET ─────────────────────────────────────────
// No Corta color or typography specification exists in this repository, and
// none may be invented (corta/docs/BRAND_ASSETS.md lists what to supply). Until
// Corta's tokens are filled in below, each slot falls back to the upstream
// `github` preset (GitHub Light Default / Dark Default): a neutral, AA-checked
// palette with hand-tuned light AND dark modes and complete terminal ANSI sets.
// Typography falls back to the system UI stacks, with no remote font download
// (a client on a firm's network should not fetch fonts from a third party).
//
// To apply the Corta identity: fill CORTA_TOKENS (partial overrides are fine),
// rebuild, and review both modes. Nothing else in the app needs to change.

import type { DesktopTerminalPalette, DesktopTheme, DesktopThemeColors, DesktopThemeTypography } from '@/themes/types'

interface CortaTokens {
  /** Light-mode color slots. */
  light: Partial<DesktopThemeColors>
  /** Dark-mode color slots. */
  dark: Partial<DesktopThemeColors>
  terminal: Partial<DesktopTerminalPalette>
  darkTerminal: Partial<DesktopTerminalPalette>
  /** Leave fontUrl unset unless the font is self-hosted. */
  typography: Partial<DesktopThemeTypography>
}

/** Corta's own values. Empty = not supplied by Corta yet (see header). */
export const CORTA_TOKENS: CortaTokens = {
  light: {},
  dark: {},
  terminal: {},
  darkTerminal: {},
  typography: {}
}

/** The upstream preset each unsupplied slot falls back to. */
export const CORTA_FALLBACK_PRESET = 'github'

export const CORTA_THEME_NAME = 'corta'

/**
 * Build the Corta preset from the upstream fallback preset and the system
 * typography. Takes its inputs as arguments so the built-in table in
 * src/themes/presets.ts stays the only place presets are assembled.
 */
export function buildCortaTheme(fallback: DesktopTheme, typography: DesktopThemeTypography): DesktopTheme {
  const darkBase = fallback.darkColors ?? fallback.colors

  return {
    name: CORTA_THEME_NAME,
    label: 'Corta',
    description: 'Corta',
    colors: { ...fallback.colors, ...CORTA_TOKENS.light },
    darkColors: { ...darkBase, ...CORTA_TOKENS.dark },
    typography: { fontSans: typography.fontSans, fontMono: typography.fontMono, ...CORTA_TOKENS.typography },
    terminal: { ...fallback.terminal, ...CORTA_TOKENS.terminal },
    darkTerminal: { ...(fallback.darkTerminal ?? fallback.terminal), ...CORTA_TOKENS.darkTerminal }
  }
}
