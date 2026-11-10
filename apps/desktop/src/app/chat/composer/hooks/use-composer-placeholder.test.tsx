import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { I18nProvider, TRANSLATIONS, useI18n } from '@/i18n'

import { useComposerPlaceholder } from './use-composer-placeholder'

function Composer() {
  const { setLocale } = useI18n()
  const placeholder = useComposerPlaceholder({ disabled: false, reconnecting: false, sessionId: null })

  return (
    <>
      <p data-testid="placeholder">{placeholder}</p>
      <button onClick={() => void setLocale('fr')} type="button">
        fr
      </button>
    </>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// The locale usually resolves after the composer mounts; the starter already
// shown must then read in the new language, not stay in the boot language.
it('re-reads its resting starter in a language resolved after mount', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)

  render(
    <I18nProvider configClient={null} initialLocale="en">
      <Composer />
    </I18nProvider>
  )

  const pick = (pool: readonly string[]) => pool[Math.floor(0.5 * pool.length)]
  expect(screen.getByTestId('placeholder').textContent).toBe(pick(TRANSLATIONS.en.composer.newSessionPlaceholders))

  fireEvent.click(screen.getByRole('button', { name: 'fr' }))

  expect(screen.getByTestId('placeholder').textContent).toBe(pick(TRANSLATIONS.fr.composer.newSessionPlaceholders))
})
