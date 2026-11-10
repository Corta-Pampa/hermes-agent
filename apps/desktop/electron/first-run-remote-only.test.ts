// CORTA CUSTOMIZATION — the Light (remote-only) client never continues into a
// local install, whatever the renderer sends.
import assert from 'node:assert/strict'

import { test } from 'vitest'

import { bootstrapNeededBackend } from './bootstrap-needed-backend'
import { createFirstRunSetupGate } from './first-run-setup-gate'

const facts = { activeRoot: '/tmp/hermes-home/hermes-agent', installStamp: null, isPackaged: true }

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test('a remote-only choice refuses to continue locally and still accepts a remote apply', async () => {
  const gate = createFirstRunSetupGate({ stuckAfterMs: 0 })
  const decision = gate.wait(bootstrapNeededBackend([], facts, 'remote-only'))

  gate.continueLocal()

  assert.equal(await Promise.race([decision, delay(10).then(() => 'pending')]), 'pending')
  assert.equal(gate.isLocalBootstrapConfirmed(), false)
  assert.equal(gate.abandonForRemoteApply(), true)
  assert.equal(await decision, 'remote-applied')
})

test('the upstream installer offer still continues locally', async () => {
  const gate = createFirstRunSetupGate({ stuckAfterMs: 0 })
  const decision = gate.wait(bootstrapNeededBackend([], facts, 'none'))

  gate.continueLocal()

  assert.equal(await decision, 'continue-local')
})
