import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { type I18nConfigClient, I18nProvider, useI18n } from './context'

function LocaleProbe() {
  return <p data-testid="locale">{useI18n().locale}</p>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (window as { hermesDesktop?: unknown }).hermesDesktop
})

// A remote-only client before its gateway is set up has no config to read: its
// first screens must speak the OS language, not fall back to English.
it('settles on the OS language when the config cannot be read', async () => {
  window.hermesDesktop = { getMachineProfile: vi.fn(async () => ({ locale: 'fr-FR' })) } as never

  const configClient: I18nConfigClient = {
    getConfig: vi.fn().mockRejectedValue(new Error('no gateway yet')),
    saveConfig: vi.fn()
  }

  render(
    <I18nProvider configClient={configClient}>
      <LocaleProbe />
    </I18nProvider>
  )

  await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('fr'))
})

// With no gateway set up the config read never answers at all.
it('paints the OS language while the config read is still pending', async () => {
  window.hermesDesktop = { getMachineProfile: vi.fn(async () => ({ locale: 'fr-FR' })) } as never

  const configClient: I18nConfigClient = {
    getConfig: vi.fn(() => new Promise<never>(() => undefined)),
    saveConfig: vi.fn()
  }

  render(
    <I18nProvider configClient={configClient}>
      <LocaleProbe />
    </I18nProvider>
  )

  await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('fr'))
})
