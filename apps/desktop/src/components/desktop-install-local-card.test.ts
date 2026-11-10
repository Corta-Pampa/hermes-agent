// CORTA CUSTOMIZATION — the setup choice offers no local card to the remote-only client.
import { describe, expect, it } from 'vitest'

import { localCardPresentation } from './desktop-install-local-card'

describe('localCardPresentation', () => {
  it('offers a local card with the upstream subtitles', () => {
    expect(localCardPresentation('none')).toMatchObject({ offered: true, subtitle: 'setupChoiceDesc' })
    expect(localCardPresentation('installed')).toMatchObject({ offered: true, subtitle: 'setupChoiceDescLocal' })
  })

  it('offers no local card and no install path to the remote-only client', () => {
    expect(localCardPresentation('remote-only')).toMatchObject({
      offered: false,
      showInstallTo: false,
      subtitle: 'remoteSetupDesc'
    })
  })
})
