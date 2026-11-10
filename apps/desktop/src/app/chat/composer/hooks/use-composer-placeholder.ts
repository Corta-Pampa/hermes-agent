import { useEffect, useRef, useState } from 'react'

import { useI18n } from '@/i18n'
import { resetBrowseState } from '@/store/composer-input-history'

interface UseComposerPlaceholderOptions {
  disabled: boolean
  reconnecting: boolean
  sessionId: null | string | undefined
}

/**
 * The composer's placeholder text. A resting starter (new session) / continuation
 * (existing session) is picked once and only re-rolled when we genuinely move to
 * a *different* conversation — the null→id persist of a freshly-started session
 * keeps its starter so the text doesn't flip mid-stream. While the transport is
 * down, it swaps to a reconnecting / starting message instead.
 *
 * The pick is a position in the pool, not its text: the locale often resolves
 * after the composer mounts (the backend config arrives late), and the same
 * pick must then read in the new language.
 */
export function useComposerPlaceholder({ disabled, reconnecting, sessionId }: UseComposerPlaceholderOptions): string {
  const { t } = useI18n()
  const newSessionPlaceholders = t.composer.newSessionPlaceholders
  const followUpPlaceholders = t.composer.followUpPlaceholders

  const [resting, setResting] = useState(() => pickResting(sessionId))

  const prevSessionIdRef = useRef(sessionId)

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    const prev = prevSessionIdRef.current
    prevSessionIdRef.current = sessionId

    if (prev === sessionId) {
      return
    }

    // null → id: the new session we're already in just got persisted. Keep the
    // starter we showed instead of swapping to a follow-up under the user.
    if (prev == null && sessionId) {
      return
    }

    resetBrowseState(prev)
    setResting(pickResting(sessionId))
  }, [sessionId])

  const pool = resting.followUp ? followUpPlaceholders : newSessionPlaceholders

  // When the transport is disabled it's because the gateway isn't open.
  // Distinguish a cold start ("Starting Hermes...") from a dropped connection
  // we're trying to restore. During reconnect, keep the textbox editable so a
  // flaky network doesn't block drafting; only submit/backend actions stay
  // disabled until the gateway is open again.
  return disabled
    ? reconnecting
      ? t.composer.placeholderReconnecting
      : t.composer.placeholderStarting
    : pool[Math.floor(resting.position * pool.length)]
}

/** A resting pick: which pool, and where in it as a fraction in [0, 1). */
function pickResting(sessionId: null | string | undefined) {
  return { followUp: Boolean(sessionId), position: Math.random() }
}
