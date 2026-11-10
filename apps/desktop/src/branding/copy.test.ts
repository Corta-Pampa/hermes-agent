// CORTA CUSTOMIZATION — contract for the product-name rewrite of bundled copy.
import { describe, expect, it } from 'vitest'

import { en } from '@/i18n/en'
import { fr } from '@/i18n/fr'

import { type RendererBrand, UPSTREAM_BRAND } from './brand'
import { brandCatalogs, rebrandText } from './copy'

const CORTA: RendererBrand = { ...UPSTREAM_BRAND, id: 'corta', productName: 'Corta', rewriteCopy: true }

function leaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value)
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => leaves(item, out))
  }

  return out
}

describe('rebrandText', () => {
  it('names the brand where copy names the desktop product', () => {
    expect(rebrandText('Restart Hermes Desktop', 'Corta')).toBe('Restart Corta')
    expect(rebrandText('Hermes is waiting for your response.', 'Corta')).toBe('Corta is waiting for your response.')
    expect(rebrandText("Hermes' background service", 'Corta')).toBe("Corta's background service")
    expect(rebrandText('Mettre à jour Hermes', 'Corta')).toBe('Mettre à jour Corta')
  })

  it('keeps third-party names and lowercase technical tokens', () => {
    expect(rebrandText('Sign in to Hermes Cloud', 'Corta')).toBe('Sign in to Hermes Cloud')
    expect(rebrandText('Install Hermes Agent on the server', 'Corta')).toBe('Install Hermes Agent on the server')
    expect(rebrandText('run `hermes gateway` or open hermes://plugin', 'Corta')).toBe(
      'run `hermes gateway` or open hermes://plugin'
    )
  })
})

describe('brandCatalogs', () => {
  it('returns the very same catalogs for the upstream brand', () => {
    const catalogs = { en }

    expect(brandCatalogs(catalogs, UPSTREAM_BRAND)).toBe(catalogs)
  })

  it('leaves no desktop-product "Hermes" in the shipped English and French copy', () => {
    const branded = brandCatalogs({ en, fr }, CORTA)
    const offenders = leaves(branded).filter(text => /\bHermes\b(?! (?:Agent|Cloud)\b)/.test(text))

    expect(offenders).toEqual([])
  })

  it('rewrites formatter output but never the data interpolated into it', () => {
    const branded = brandCatalogs({ greet: (name: string) => `Hermes says hi to ${name}` }, CORTA)

    expect(branded.greet('Hermes Lab')).toBe('Corta says hi to Hermes Lab')
  })
})
