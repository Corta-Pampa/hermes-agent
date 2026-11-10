// CORTA CUSTOMIZATION
// Desktop brand layer: THE single source for every brand-shaped value the
// desktop build owns (product names, OS identifiers, publisher, installer
// chrome, update origin, renderer branding).
//
// The brand is chosen at build time by HERMES_DESKTOP_BRAND, orthogonal to
// HERMES_DESKTOP_VARIANT:
//   (unset) | hermes  -> upstream Hermes identity, byte-for-byte what
//                        NousResearch/hermes-agent ships. Upstream tests and
//                        upstream build commands keep working unchanged.
//   corta             -> the Corta commercial distribution.
//
// Keep brand values HERE. Upstream files only read them through
// product-identity.cjs (packaging + main process) and the renderer brand
// define (branding/vite-brand.mjs). See corta/docs/BRANDING.md.
// @ts-check
'use strict'

/** @typedef {import('./brands.d.cts').DesktopBrand} DesktopBrand */

/** @type {Record<string, DesktopBrand>} */
const BRANDS = {
  // Upstream values, copied verbatim from the pre-brand-layer code. Do not
  // edit: a divergence here silently changes what an upstream-style build is.
  hermes: {
    id: 'hermes',
    variants: {
      '': { display: 'Hermes', kebab: 'hermes', pascal: 'Hermes' },
      light: { display: 'Hermes Light', kebab: 'hermes-light', pascal: 'HermesLight' },
      bundled: { display: 'Hermes Agent', kebab: 'hermes-bundled', pascal: 'HermesBundled' }
    },
    appIdPrefix: 'com.nousresearch',
    msixOrg: 'NousResearch',
    cliNames: { default: 'hermes', light: 'hermes-light' },
    isolatedUserData: false,
    supportsStore: true,
    publisherDisplayName: 'Nous Research',
    msixPublisher: null,
    copyright: 'Copyright © 2026 Nous Research',
    linux: {
      maintainer: 'Nous Research <support@nousresearch.com>',
      synopsis: 'Native desktop shell for Hermes Agent.',
      lightSynopsis: 'Remote-only desktop client for Hermes Agent.'
    },
    macCategory: 'public.app-category.developer-tools',
    dmg: {
      title: 'Hermes Agent Installer',
      background: 'packaging/nous-dmg-2b.tiff',
      icon: 'packaging/dmg-volume.icns'
    },
    updates: { feedBaseUrl: null, allowGithubFallback: true },
    renderer: {
      id: 'hermes',
      productName: 'Hermes',
      mark: { light: 'nous-girl.png', dark: 'nous-girl-dark.png' },
      logo: null,
      defaultSkin: null,
      builtinSkins: null,
      rewriteCopy: false,
      attribution: null
    }
  },

  corta: {
    id: 'corta',
    // Corta Desktop Remote is the commercial product: the `light` variant.
    // The other variants stay buildable under the Corta brand, each with its
    // own OS identity so no two Corta builds share userData or a lock.
    variants: {
      light: { display: 'Corta', kebab: 'desktop', pascal: 'CortaDesktop' },
      '': { display: 'Corta Local', kebab: 'desktop-local', pascal: 'CortaLocal' },
      bundled: { display: 'Corta Agent', kebab: 'desktop-agent', pascal: 'CortaAgent' }
    },
    // Reverse-DNS of corta.fr. Never com.nousresearch.*: an official Hermes
    // install and a Corta install must never share an OS identity.
    appIdPrefix: 'fr.corta',
    msixOrg: 'Corta',
    cliNames: { default: 'corta', light: 'corta-remote' },
    // userData/<appNamePascal> is pinned before first access, so Corta never
    // reads or writes an official Hermes Desktop's Electron state.
    isolatedUserData: true,
    // Store packaging uses Nous Research's Partner Center identity; Corta has
    // none, so the store variant is refused under this brand.
    supportsStore: false,
    publisherDisplayName: 'Corta',
    // MSIX publisher MUST equal the subject of the certificate that signs the
    // package. Provide the real subject through CORTA_MSIX_PUBLISHER when the
    // Corta signing certificate exists (corta/docs/RELEASE.md).
    msixPublisher: process.env.CORTA_MSIX_PUBLISHER || 'CN=Corta',
    copyright: 'Corta. Built on Hermes Agent, Copyright © 2026 Nous Research (MIT License)',
    linux: {
      maintainer: 'Corta',
      synopsis: 'Corta desktop client.',
      lightSynopsis: 'Corta remote desktop client.'
    },
    macCategory: 'public.app-category.business',
    // No Corta installer artwork exists yet (corta/docs/BRAND_ASSETS.md):
    // null keeps electron-builder's neutral defaults instead of Nous artwork.
    dmg: { title: null, background: null, icon: null },
    // The Corta-controlled update origin. CLOUDFLARE_R2_PUBLIC_URL (CI) still
    // wins when set; GitHub releases are never used as a Corta feed.
    updates: { feedBaseUrl: 'https://updates.corta.fr', allowGithubFallback: false },
    renderer: {
      id: 'corta',
      productName: 'Corta',
      // Sources: corta/brand/logo/. The dark-mode files are Corta's own
      // (light badge, ink letters); the light-mode files swap the two brand
      // colors so the badge does not vanish on the #E7EDF7 background.
      mark: { light: 'corta/mark.svg', dark: 'corta/mark-dark.svg' },
      logo: { light: 'corta/logo.svg', dark: 'corta/logo-dark.svg' },
      defaultSkin: 'corta',
      builtinSkins: ['corta'],
      rewriteCopy: true,
      attribution: { engine: 'Hermes Agent', author: 'Nous Research', license: 'MIT' }
    }
  }
}

const BRAND_IDS = Object.keys(BRANDS)

/** @param {string | undefined} raw @returns {DesktopBrand} */
function resolveBrand(raw) {
  const id = (raw || '').trim() || 'hermes'
  const brand = BRANDS[id]
  if (!brand) {
    throw new Error(`Unknown HERMES_DESKTOP_BRAND ${id}. expected one of (empty), ${BRAND_IDS.join(', ')}`)
  }
  return brand
}

/** @returns {DesktopBrand} */
function activeBrand() {
  return resolveBrand(process.env.HERMES_DESKTOP_BRAND)
}

module.exports = { BRANDS, BRAND_IDS, resolveBrand, activeBrand }
