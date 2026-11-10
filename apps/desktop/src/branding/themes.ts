// CORTA CUSTOMIZATION
// Brand policy over the built-in theme table: which presets a build offers and
// which one a fresh install paints. The upstream brand gets the upstream table
// and default back unchanged.

import type { DesktopTheme, DesktopThemeTypography } from '@/themes/types'

import { BRAND, type RendererBrand } from './brand'
import { buildCortaTheme, CORTA_FALLBACK_PRESET, CORTA_THEME_NAME } from './corta-theme'

/**
 * The built-in presets for `brand`: the upstream table plus the Corta preset,
 * narrowed to `brand.builtinSkins` when the brand pins them. A stored pick of a
 * preset the brand does not offer resolves to the brand default on next paint
 * (normalizeSkin in src/themes/context.tsx) — the stored value is left alone.
 */
export function brandBuiltinThemes(
  upstream: Record<string, DesktopTheme>,
  typography: DesktopThemeTypography,
  brand: RendererBrand = BRAND
): Record<string, DesktopTheme> {
  if (!brand.builtinSkins) {
    return upstream
  }

  const fallback = upstream[CORTA_FALLBACK_PRESET]

  const all: Record<string, DesktopTheme> = fallback
    ? { [CORTA_THEME_NAME]: buildCortaTheme(fallback, typography), ...upstream }
    : upstream

  return Object.fromEntries(brand.builtinSkins.filter(name => all[name]).map(name => [name, all[name]]))
}

/** The skin a fresh install paints: the brand's, else the upstream default. */
export function brandDefaultSkin(upstreamDefault: string, brand: RendererBrand = BRAND): string {
  return brand.defaultSkin ?? upstreamDefault
}
