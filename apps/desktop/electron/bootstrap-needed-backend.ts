// The "nothing usable yet" sentinel resolveHermesBackend returns when no local
// runtime can start: the first-run setup gate consumes it and offers the
// choices its `local` names. Moved out of main.ts (code-health file cap) by
// the Corta fork, which adds the remote-only flavour.
//
// CORTA CUSTOMIZATION: `local: 'remote-only'` is the Light client's sentinel —
// the setup choice then offers only a remote connection, and the first-run gate
// refuses to continue into a local install (see first-run-setup-gate.ts).

import type { InstallStamp } from './install-stamp'

export type BootstrapLocalOffer = 'none' | 'remote-only'

export interface BootstrapNeededFacts {
  activeRoot: string
  installStamp: Readonly<InstallStamp> | null
  isPackaged: boolean
}

const LABELS: Record<BootstrapLocalOffer, string> = {
  none: 'Hermes Agent not installed yet; bootstrap required',
  'remote-only': 'Remote-only client; no remote gateway configured yet'
}

export function bootstrapNeededBackend(backendArgs: string[], facts: BootstrapNeededFacts, local: BootstrapLocalOffer) {
  return {
    kind: 'bootstrap-needed',
    label: LABELS[local],
    command: null,
    args: backendArgs,
    bootstrap: true,
    env: {},
    shell: false,
    // Hints for the bootstrap runner / UI layer:
    activeRoot: facts.activeRoot,
    installStamp: facts.installStamp, // may be null in dev
    isPackaged: facts.isPackaged,
    platform: process.platform,
    local
  }
}
