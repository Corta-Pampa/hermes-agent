// CORTA CUSTOMIZATION
// Rewrites the product name in the bundled UI catalogs for a rebranded build,
// so the ~200 "Hermes" strings per locale stay upstream-owned (no per-string
// fork) while the shipped UI names the brand. Applied once, at catalog load
// (src/i18n/catalog.ts); a brand without `rewriteCopy` gets the catalogs back
// untouched.
//
// What is rewritten: the desktop product name ("Hermes", "Hermes Desktop",
// "Hermes Light"). What is NOT: third-party product/service names that remain
// true for a Corta client — "Hermes Agent" (the engine the server runs) and
// "Hermes Cloud" (a Nous Research hosted service) — plus anything lowercase
// (`hermes` commands, `hermes://` links, paths, config keys).

import type { RendererBrand } from './brand'

interface CopyRule {
  pattern: RegExp
  replace: (name: string) => string
}

const RULES: readonly CopyRule[] = [
  { pattern: /\bHermes (?:Desktop|Light)\b/g, replace: name => name },
  // English possessive ("Hermes' background service").
  { pattern: /\bHermes'(?=\s)/g, replace: name => `${name}'s` },
  { pattern: /\bHermes\b(?! (?:Agent|Cloud)\b)/g, replace: name => name }
]

export function rebrandText(text: string, name: string): string {
  let out = text

  for (const rule of RULES) {
    out = out.replace(rule.pattern, rule.replace(name))
  }

  return out
}

type Formatter = (...args: unknown[]) => unknown

// A formatter's interpolated arguments are user/server data (a profile or host
// named "Hermes" must survive), so they are fenced off before the rewrite.
function rebrandFormatter(fn: Formatter, name: string): Formatter {
  return (...args: unknown[]) => {
    const out = fn(...args)

    if (typeof out !== 'string') {
      return out
    }

    const held: string[] = []
    let fenced = out

    for (const arg of args) {
      if (typeof arg === 'string' && arg && /Hermes/.test(arg) && fenced.includes(arg)) {
        fenced = fenced.split(arg).join(`\uE000${held.push(arg) - 1}\uE000`)
      }
    }

    return rebrandText(fenced, name).replace(/\uE000(\d+)\uE000/g, (_, index: string) => held[Number(index)])
  }
}

function rebrandValue(value: unknown, name: string): unknown {
  if (typeof value === 'string') {
    return rebrandText(value, name)
  }

  if (typeof value === 'function') {
    return rebrandFormatter(value as Formatter, name)
  }

  if (Array.isArray(value)) {
    return value.map(item => rebrandValue(item, name))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebrandValue(item, name)]))
  }

  return value
}

/** The catalog table with the product name rewritten for `brand` (identity when the brand opts out). */
export function brandCatalogs<T extends Record<string, unknown>>(catalogs: T, brand: RendererBrand): T {
  if (!brand.rewriteCopy) {
    return catalogs
  }

  return rebrandValue(catalogs, brand.productName) as T
}
