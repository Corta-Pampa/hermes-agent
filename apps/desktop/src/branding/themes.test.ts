// CORTA CUSTOMIZATION — contract for the brand theme policy.
import { describe, expect, it } from 'vitest'

import { DEFAULT_TYPOGRAPHY, githubTheme, nousTheme } from '@/themes/presets'
import type { DesktopTheme } from '@/themes/types'

import { type RendererBrand, UPSTREAM_BRAND } from './brand'
import { CORTA_THEME_NAME } from './corta-theme'
import { brandBuiltinThemes, brandDefaultSkin } from './themes'

const CORTA: RendererBrand = { ...UPSTREAM_BRAND, id: 'corta', defaultSkin: 'corta', builtinSkins: ['corta'] }
const upstream: Record<string, DesktopTheme> = { nous: nousTheme, github: githubTheme }

describe('brand theme policy', () => {
  it('leaves the upstream table and default untouched for the upstream brand', () => {
    expect(brandBuiltinThemes(upstream, DEFAULT_TYPOGRAPHY, UPSTREAM_BRAND)).toBe(upstream)
    expect(brandDefaultSkin('nous', UPSTREAM_BRAND)).toBe('nous')
  })

  it('offers only the Corta preset and paints it by default', () => {
    const themes = brandBuiltinThemes(upstream, DEFAULT_TYPOGRAPHY, CORTA)

    expect(Object.keys(themes)).toEqual([CORTA_THEME_NAME])
    expect(brandDefaultSkin('nous', CORTA)).toBe(CORTA_THEME_NAME)
  })

  it('is a complete preset: both modes, terminal palettes, local typography', () => {
    const corta = brandBuiltinThemes(upstream, DEFAULT_TYPOGRAPHY, CORTA)[CORTA_THEME_NAME]

    for (const palette of [corta.colors, corta.darkColors]) {
      expect(palette?.background).toBeTruthy()
      expect(palette?.foreground).toBeTruthy()
      expect(palette?.primary).toBeTruthy()
      expect(palette?.sidebarBackground).toBeTruthy()
      expect(palette?.userBubble).toBeTruthy()
    }

    expect(corta.colors.background).not.toBe(corta.darkColors?.background)
    expect(corta.terminal?.red).toBeTruthy()
    expect(corta.darkTerminal?.red).toBeTruthy()
    expect(corta.typography?.fontMono).toContain('JetBrains Mono')
    expect(corta.typography?.fontUrl).toBeUndefined()
    expect(corta.customCSS).toBeUndefined()
  })
})
