'use client'
import { useState } from 'react'
import { totalSignals } from '@/lib/taste'
import { useTaste } from '@/hooks/useTaste'

/**
 * What the gift finder remembers, said plainly, next to the control that
 * deletes it.
 *
 * A taste profile is personal data even though it never leaves the browser and
 * is not tied to an account — it is a record of what someone liked and rejected.
 * So the disclosure shows whether or not anything has been collected yet (it is
 * a statement about what the finder *will* do, not only what it has done), and
 * the delete control appears as soon as there is something to delete.
 *
 * Deliberately not buried in a policy page. The person most likely to want this
 * is the one who has just been given suggestions they did not expect.
 */

type Props = {
  /** `panel` sits inside the Gift Finder; `footer` is the site-wide one-liner. */
  variant: 'panel' | 'footer'
}

export default function TasteNote({ variant }: Props) {
  const { taste, reset } = useTaste()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const has = totalSignals(taste) > 0

  function onClick() {
    // Two taps rather than a `confirm()` dialog: this is undoable only by
    // starting over, and a native modal over a kawaii storefront is jarring.
    if (!confirming) { setConfirming(true); return }
    reset()
    setConfirming(false)
    setDone(true)
    setTimeout(() => setDone(false), 2200)
  }

  const button = (has || done) && (
    <button
      type="button"
      onClick={onClick}
      onBlur={() => setConfirming(false)}
      disabled={done}
      className={variant === 'panel'
        ? `shrink-0 border-2 font-display font-extrabold px-3 py-1.5 rounded-full cursor-pointer text-[11.5px] leading-none transition-colors
           ${done ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
                  : confirming ? 'border-[#e0227a] bg-[#e0227a] text-white'
                  : 'border-[#6495ED] bg-white text-[#4a6fb5] hover:bg-[#6495ED] hover:text-white'}`
        : `shrink-0 underline font-extrabold cursor-pointer bg-transparent border-none p-0 text-inherit ${confirming ? 'text-[#a3125c]' : ''}`}
      aria-label="Delete what this site has learned about your taste"
    >
      {done ? 'Forgotten ✓' : confirming ? 'Sure? Forget it' : 'Forget what you know about me'}
    </button>
  )

  if (variant === 'footer') {
    return (
      <p className="mt-0.5">
        Your 👍 and 👎 stay in this browser — no account, never sent to us.{' '}
        We report page visits and clicks to Pinterest for ad measurement (IP and
        browser only); Do Not Track and Global Privacy Control are honoured.{' '}
        {button}
      </p>
    )
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-semibold text-[#9a8fa3] px-1">
      <span>
        Your 👍 and 👎 stay on this device — no account, no cookie, nothing sent to us.
        They only shape what this browser sees.
      </span>
      {button}
    </div>
  )
}
