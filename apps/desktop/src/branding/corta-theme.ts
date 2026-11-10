// CORTA CUSTOMIZATION
// The Corta desktop theme, a native preset of the Hermes theme system
// (src/themes/types.ts → DesktopTheme). Every surface of the app paints from
// these slots: applyTheme (src/themes/context.tsx) derives the design-system
// variables (--dt-*, --theme-*, --ui-*) for backgrounds, cards, sidebar,
// popovers/menus/modals, borders, inputs, focus rings, buttons, bubbles,
// status colors and the integrated terminal. No global CSS override is used.
//
// ─── BRAND TOKENS ───────────────────────────────────────────────────────────
// Corta's palette is three colors: ink #0A0A16, paper #E7EDF7 and an
// occasional mint #6FBF98. Every other slot is a mix of those (ink↔paper for
// surfaces and borders, paper/ink↔mint for soft tints), with text contrast
// checked at ≥ 4.5:1 on every surface it sits on.
//
// Mint is the accent, used sparingly. It reaches only 1.9:1 on paper, so in
// light mode it never carries text or the focus ring: it tints the user bubble,
// secondary buttons and the composer outline, while the brand stroke
// (midground: section labels, active pills, streaming cursor) stays ink. On ink
// it reaches 9:1, so dark mode uses it as the brand stroke and focus ring.
//
// Unsupplied slots (destructive red, terminal ANSI sets, typography) fall back
// to the upstream `github` preset and the system UI font stacks, with no remote
// font download (a client on a firm's network should not fetch fonts from a
// third party).

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

const INK = '#0A0A16'
const PAPER = '#E7EDF7'
const MINT = '#6FBF98'

/** Corta's own values (see header); omitted slots fall back to the preset. */
export const CORTA_TOKENS: CortaTokens = {
  light: {
    background: PAPER,
    foreground: INK,
    card: '#F2F5FB',
    cardForeground: INK,
    muted: '#DCE2EC',
    mutedForeground: '#5A5C67',
    popover: '#F5F8FC',
    popoverForeground: INK,
    primary: INK,
    primaryForeground: PAPER,
    secondary: '#CDE3E2',
    secondaryForeground: INK,
    accent: '#D8DDE7',
    accentForeground: INK,
    border: '#C6CBD5',
    input: '#F5F8FC',
    ring: INK,
    midground: INK,
    midgroundForeground: PAPER,
    composerRing: MINT,
    sidebarBackground: '#DFE5EF',
    sidebarBorder: '#C6CBD5',
    userBubble: '#CFE4E4',
    userBubbleBorder: '#B1D8CC'
  },
  dark: {
    background: INK,
    foreground: PAPER,
    card: '#12121E',
    cardForeground: PAPER,
    muted: '#191A26',
    mutedForeground: '#8F929D',
    popover: '#171824',
    popoverForeground: PAPER,
    primary: PAPER,
    primaryForeground: INK,
    secondary: '#1C2B2D',
    secondaryForeground: PAPER,
    accent: '#1E1E2A',
    accentForeground: PAPER,
    border: '#2D2E3A',
    input: '#080810',
    ring: MINT,
    midground: MINT,
    midgroundForeground: INK,
    composerRing: MINT,
    sidebarBackground: '#07070F',
    sidebarBorder: '#2D2E3A',
    userBubble: '#172227',
    userBubbleBorder: '#2A4440'
  },
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
