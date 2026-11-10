#!/usr/bin/env node
// CORTA CUSTOMIZATION
// Release gate: a Corta installer must not ship Hermes/Nous Research brand
// artwork. Compares every packaged brand asset against the git blob ids
// recorded at the fork point (corta/brand/upstream-brand-assets.json) and
// checks that the renderer brand has a mark.
//
//   node corta/scripts/check-brand-assets.mjs            # report, exit 1 on findings
//   CORTA_ALLOW_PLACEHOLDER_ASSETS=1 node ...            # report, exit 0 (internal test builds only)
//
// Never modifies anything.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifest = JSON.parse(readFileSync(join(root, 'corta/brand/upstream-brand-assets.json'), 'utf8'))
const { BRANDS } = createRequire(import.meta.url)(join(root, 'apps/desktop/branding/brands.cjs'))
const corta = BRANDS.corta

const blobId = file => execFileSync('git', ['hash-object', file], { cwd: root, encoding: 'utf8' }).trim()

const findings = []
// Not blocking: a neutral default is not another brand's identity.
const warnings = []

// Hermes-only installer artwork Corta's build never references (its DMG names its own).
const notShipped = new Set(
  ['background', 'icon']
    .map(key => BRANDS.hermes.dmg[key])
    .filter(path => path && !Object.values(corta.dmg).includes(path))
    .map(path => `apps/desktop/${path}`)
)

for (const [file, upstreamId] of Object.entries(manifest.assets)) {
  if (!notShipped.has(file) && existsSync(join(root, file)) && blobId(file) === upstreamId) {
    findings.push(`still the Hermes/Nous asset: ${file}`)
  }
}

if (!corta.renderer.mark) {
  findings.push('no Corta brand mark: set BRANDS.corta.renderer.mark in apps/desktop/branding/brands.cjs')
}

// The DMG title already defaults to "<product> Installer"; the artwork has no default of Corta's own.
for (const key of ['background', 'icon']) {
  if (corta.dmg[key] === null) {
    warnings.push(`no Corta DMG ${key}: electron-builder's neutral default is used (set BRANDS.corta.dmg.${key})`)
  }
}

warnings.forEach(line => console.log(`[corta] warning: ${line}`))

if (!findings.length) {
  console.log('[corta] brand assets: OK')
  process.exit(0)
}

console.log(`[corta] brand assets: ${findings.length} finding(s)`)
// Group the per-file icon findings so the report stays readable.
const icons = findings.filter(line => line.startsWith('still the'))
console.log(`  - ${icons.length} packaged file(s) are still Hermes/Nous artwork (e.g. ${icons.slice(0, 3).map(l => l.split(': ')[1]).join(', ')})`)
findings.filter(line => !line.startsWith('still the')).forEach(line => console.log(`  - ${line}`))
console.log('  See corta/docs/BRAND_ASSETS.md for what to supply and how to install it.')

if (process.env.CORTA_ALLOW_PLACEHOLDER_ASSETS === '1') {
  console.log('[corta] CORTA_ALLOW_PLACEHOLDER_ASSETS=1: continuing. NOT for client distribution.')
  process.exit(0)
}

process.exit(1)
