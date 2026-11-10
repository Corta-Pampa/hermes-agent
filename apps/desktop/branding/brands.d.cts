// CORTA CUSTOMIZATION — types for branding/brands.cjs.

interface BrandVariantName {
  /** OS-visible product name. e.g. "Corta" */
  display: string
  /** Last appId segment. e.g. "desktop" -> fr.corta.desktop */
  kebab: string
  /** userData dir / package name. e.g. "CortaDesktop" */
  pascal: string
}

/** What the renderer bundle learns about the brand (vite define). */
export interface RendererBrand {
  id: string
  productName: string
  /** public/ paths of the theme-aware mark; null renders no mark. */
  mark: { light: string; dark: string } | null
  /** Skin a fresh install paints; null keeps the upstream default. */
  defaultSkin: string | null
  /** Built-in skins offered in the picker; null offers every built-in. */
  builtinSkins: string[] | null
  /** Rewrite the product name in bundled UI copy. */
  rewriteCopy: boolean
  /** Engine attribution shown where the product is described. */
  attribution: { engine: string; author: string; license: string } | null
}

export interface DesktopBrand {
  id: string
  variants: Record<'' | 'light' | 'bundled', BrandVariantName>
  appIdPrefix: string
  msixOrg: string
  cliNames: { default: string; light: string }
  isolatedUserData: boolean
  supportsStore: boolean
  publisherDisplayName: string
  /** Out-of-store MSIX publisher; null keeps the upstream ATS subject. */
  msixPublisher: string | null
  copyright: string
  linux: { maintainer: string; synopsis: string; lightSynopsis: string }
  macCategory: string
  dmg: { title: string | null; background: string | null; icon: string | null }
  updates: { feedBaseUrl: string | null; allowGithubFallback: boolean }
  renderer: RendererBrand
}

export declare const BRANDS: Record<string, DesktopBrand>
export declare const BRAND_IDS: string[]
export declare function resolveBrand(raw: string | undefined): DesktopBrand
export declare function activeBrand(): DesktopBrand
