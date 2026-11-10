// CORTA CUSTOMIZATION
// Vite plugin that hands the renderer its brand (branding/brands.cjs, chosen
// by HERMES_DESKTOP_BRAND at build time) as the `__HERMES_DESKTOP_BRAND__`
// define, and names the window in index.html. With the variable unset it
// defines the upstream Hermes brand, so an upstream-style build is unchanged.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { activeBrand } = require('./brands.cjs')

const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

export function desktopBrand() {
  const { renderer } = activeBrand()

  return {
    name: 'hermes:desktop-brand',
    config: () => ({ define: { __HERMES_DESKTOP_BRAND__: JSON.stringify(renderer) } }),
    transformIndexHtml: html => html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(renderer.productName)}</title>`)
  }
}
