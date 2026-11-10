// CORTA CUSTOMIZATION
// The renderer's brand, baked at build time by branding/vite-brand.mjs from
// branding/brands.cjs (HERMES_DESKTOP_BRAND). Absent define (vitest, tools that
// bundle without the plugin) = the upstream Hermes brand.

import type { RendererBrand } from '../../branding/brands.d.cts'

export type { RendererBrand }

declare const __HERMES_DESKTOP_BRAND__: RendererBrand | undefined

/** Mirrors `BRANDS.hermes.renderer` in branding/brands.cjs. */
export const UPSTREAM_BRAND: RendererBrand = Object.freeze({
  id: 'hermes',
  productName: 'Hermes',
  mark: { light: 'nous-girl.png', dark: 'nous-girl-dark.png' },
  logo: null,
  defaultSkin: null,
  builtinSkins: null,
  rewriteCopy: false,
  attribution: null
})

export const BRAND: RendererBrand = Object.freeze(
  typeof __HERMES_DESKTOP_BRAND__ === 'undefined' ? UPSTREAM_BRAND : __HERMES_DESKTOP_BRAND__
)

/** True when the brand pins the built-in skins (no alternative presets, no backend skin sync). */
export const brandLocksSkins = (brand: RendererBrand = BRAND): boolean => brand.builtinSkins !== null
