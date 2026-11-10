// CORTA CUSTOMIZATION — the Corta palette stays readable (WCAG AA) in both modes.
import { describe, expect, it } from 'vitest'

import { DEFAULT_TYPOGRAPHY, githubTheme } from '@/themes/presets'
import type { DesktopThemeColors } from '@/themes/types'

import { buildCortaTheme } from './corta-theme'

const channel = (hex: string, i: number) => {
  const v = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255

  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (hi + 0.05) / (lo + 0.05)
}

type Slot = keyof DesktopThemeColors

// Each text slot against every surface it is painted on.
const PAIRS: [Slot, Slot][] = [
  ['foreground', 'background'],
  ['foreground', 'sidebarBackground'],
  ['foreground', 'userBubble'],
  ['mutedForeground', 'background'],
  ['mutedForeground', 'card'],
  ['mutedForeground', 'muted'],
  ['mutedForeground', 'accent'],
  ['mutedForeground', 'sidebarBackground'],
  ['cardForeground', 'card'],
  ['popoverForeground', 'popover'],
  ['primaryForeground', 'primary'],
  ['secondaryForeground', 'secondary'],
  ['accentForeground', 'accent'],
  ['midgroundForeground', 'midground'],
  ['midground', 'background'],
  ['midground', 'sidebarBackground']
]

describe('Corta palette contrast', () => {
  const theme = buildCortaTheme(githubTheme, DEFAULT_TYPOGRAPHY)

  it.each([
    ['light', theme.colors],
    ['dark', theme.darkColors!]
  ])('keeps every text slot at AA (4.5:1) in %s mode', (_mode, colors) => {
    for (const [text, surface] of PAIRS) {
      expect(contrast(colors[text] as string, colors[surface] as string), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
