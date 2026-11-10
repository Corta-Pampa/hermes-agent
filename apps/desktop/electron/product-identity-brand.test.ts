// CORTA CUSTOMIZATION — the brand layer's packaging/identity contract.
// HERMES_DESKTOP_BRAND unset must stay the upstream Hermes identity; =corta
// must never reuse a Nous Research OS identity, update origin or artwork.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { afterEach, test } from 'vitest'

import { applyDesktopIdentity, type ProductIdentity } from './product-identity'

const require: NodeJS.Require = createRequire(import.meta.url)
const ENV_KEYS = ['HERMES_DESKTOP_BRAND', 'HERMES_DESKTOP_VARIANT', 'HERMES_PAYLOAD_TAG', 'HERMES_BUILD_COMMIT']

afterEach((): void => {
  ENV_KEYS.forEach(key => delete process.env[key])
})

function fresh<T>(brand: string | undefined, variant: string, file: string): T {
  ENV_KEYS.forEach(key => delete process.env[key])

  if (brand !== undefined) {
    process.env.HERMES_DESKTOP_BRAND = brand
  }

  process.env.HERMES_DESKTOP_VARIANT = variant

  for (const key of Object.keys(require.cache)) {
    if (key.includes('/apps/desktop/') && !key.includes('node_modules')) {
      delete require.cache[key]
    }
  }

  return require(file) as T
}

const identity = (brand: string | undefined, variant: string): ProductIdentity =>
  fresh<ProductIdentity>(brand, variant, '../product-identity.cjs')

const builder = (brand: string | undefined, variant: string): any =>
  fresh<any>(brand, variant, '../electron-builder.config.cjs')

test('unset brand is the upstream Hermes identity', (): void => {
  const light = identity(undefined, 'light')

  assert.equal(light.brand, 'hermes')
  assert.equal(light.appId, 'com.nousresearch.hermes-light')
  assert.equal(light.displayName, 'Hermes Light')
  assert.equal(light.isolatedUserData, false)
})

test('Corta identities are Corta-owned and distinct per variant', (): void => {
  const ids = ['', 'light', 'bundled'].map(variant => identity('corta', variant))

  for (const id of ids) {
    assert.match(id.appId, /^fr\.corta\./)
    assert.doesNotMatch(id.msixAppIdWithOrg, /NousResearch/)
    assert.equal(id.isolatedUserData, true)
  }

  assert.equal(new Set(ids.map(id => id.appId)).size, ids.length)
  assert.equal(new Set(ids.map(id => id.appNamePascal)).size, ids.length)
  assert.equal(ids[1].displayName, 'Corta')
})

test('Corta refuses the Store variant (no Corta Partner Center identity)', (): void => {
  assert.throws(() => identity('corta', 'store'), /no Store packaging identity/)
})

test('a Corta stable build pins its own userData before first access', (): void => {
  const calls: string[] = []

  const app = {
    getPath: (): string => '/appData',
    setPath: (_name: 'userData', value: string): void => void calls.push(value),
    setName: (): void => {}
  }

  assert.equal(applyDesktopIdentity(app, identity(undefined, 'light')), null)
  assert.equal(applyDesktopIdentity(app, identity('corta', 'light')), 'Corta')
  assert.deepEqual(calls, ['/appData/CortaDesktop'])
})

test('Corta packaging publishes to updates.corta.fr, never GitHub, with no Nous artwork', (): void => {
  const config = builder('corta', 'light')

  assert.deepEqual(config.publish, [{ provider: 'generic', url: 'https://updates.corta.fr', channel: 'light' }])
  assert.deepEqual(config.mac.publish, [
    { provider: 'generic', url: 'https://updates.corta.fr/releases/darwin/light/stable/', channel: 'stable' }
  ])
  assert.equal(config.extraMetadata.productName, 'Corta')
  assert.equal(config.dmg.background, undefined)
  assert.equal(config.dmg.icon, undefined)
  assert.doesNotMatch(JSON.stringify([config.msix, config.linux, config.dmg]), /Nous/)
})

test('unset brand keeps the upstream packaging', (): void => {
  const config = builder(undefined, 'light')

  assert.equal(config.dmg.title, 'Hermes Agent Installer')
  assert.equal(config.msix.publisherDisplayName, 'Nous Research')
  assert.equal(config.extraMetadata.productName, undefined)
})
