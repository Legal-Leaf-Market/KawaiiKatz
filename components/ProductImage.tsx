'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Props = {
  src: string
  alt: string
  /** Emoji shown only after all retries are exhausted. */
  fallback: string
  className?: string
  fallbackClassName?: string
  /**
   * Roughly how wide this image renders, in CSS pixels. Forwarded to /api/img,
   * which asks Shopify's CDN to resize. Snapped to a ladder there, so passing
   * an approximate number is fine and expected.
   */
  width?: number
  /**
   * Set on anything visible without scrolling — the picks rail and the first
   * row or two of the grid. Those load eagerly at high priority; everything
   * else stays lazy. Marking every image priority would be the same as marking
   * none, since the browser would have nothing left to defer.
   */
  priority?: boolean
}

/** Transient 502s from the proxy are common enough to be worth waiting out. */
const MAX_RETRIES = 4

/**
 * Product image with automatic retry and a skeleton placeholder.
 *
 * Vendor images are proxied through /api/img, which can return a transient 502
 * on a cold cache or when Shopify's CDN briefly rate-limits us, and can be slow
 * on the first request. To avoid the browser flashing the `alt` text (the
 * product name) while the image downloads, the <img> carries an empty alt (the
 * product name is already shown as real text in the card) and an animated
 * shimmer skeleton sits *behind* it until it loads.
 *
 * Behind, not in front, and the <img> is never hidden — that part is deliberate.
 * The picks rail and the first grid rows are server-rendered and eager, so the
 * browser has usually finished downloading those photos before the hydration
 * bundle has even parsed. Gating their visibility on React state meant the
 * fastest images on the page were the ones held back the longest, and any image
 * whose `load` fired before hydration was held back forever: React attaches
 * onLoad during hydration and never replays an event it missed, so `loaded`
 * stayed false and the card showed nothing but a pulsing skeleton. Painting the
 * image the moment its bytes arrive takes JavaScript out of that path entirely.
 *
 * `loaded` now only clears the skeleton, and the `complete`/`naturalWidth`
 * check below covers the missed event either way: a photo that beat hydration
 * stops shimmering underneath itself (which shows through a transparent PNG),
 * and one that *failed* before hydration still reaches the retry and the emoji.
 *
 * On repeated failure we retry a few times with backoff before dropping to the
 * category emoji fallback.
 */
export default function ProductImage({
  src,
  alt,
  fallback,
  className,
  fallbackClassName,
  width,
  priority = false,
}: Props) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ask the proxy for the size we actually render. Only for our own /api/img
  // URLs — a vendor URL passed through directly must not be rewritten.
  const sized = width && src.startsWith('/api/img') ? `${src}&w=${width}` : src

  // Cache-bust each retry so the browser actually re-requests. Note this also
  // misses the edge cache by design: a retry exists precisely because the
  // cached answer was a failure.
  const url = attempt === 0 ? sized : `${sized}${sized.includes('?') ? '&' : '?'}_r=${attempt}`

  const handleError = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (attempt >= MAX_RETRIES) {
      setFailed(true)
      return
    }
    timer.current = setTimeout(() => setAttempt((a) => a + 1), 500 * (attempt + 1))
  }, [attempt])

  // Reset when the source changes (e.g. seed -> live catalog hydration).
  useEffect(() => {
    setAttempt(0)
    setFailed(false)
    setLoaded(false)
  }, [src])

  // Recover the load/error we were never told about. An <img> that settled
  // before React attached its handlers keeps the outcome in `complete` +
  // `naturalWidth`, and that is the only record of it — the events themselves
  // are gone. Server-rendered eager images settle this way most of the time.
  useEffect(() => {
    const img = imgRef.current
    if (!img || !img.complete) return
    if (img.naturalWidth > 0) setLoaded(true)
    else handleError()
  }, [url, handleError])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!src || failed) {
    return (
      <span
        className={fallbackClassName ?? 'absolute inset-0 flex items-center justify-center text-[56px]'}
        aria-hidden="true"
      >
        {fallback}
      </span>
    )
  }

  return (
    <>
      {/* Shimmer skeleton, behind the image, until the image finishes loading */}
      {!loaded && (
        <span
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/[0.06] to-black/[0.12]"
          aria-hidden="true"
        />
      )}
      <img
        key={attempt}
        ref={imgRef}
        src={url || '/placeholder.svg'}
        /* Empty alt so the browser never paints the product name while the
           bytes are still downloading — the name is shown as text elsewhere. */
        alt=""
        aria-hidden="true"
        className={className}
        /* Positioned purely to win the paint order against the skeleton, which
           is absolute and would otherwise cover it. Below every badge and
           control on the card, which sit at z-20 and up. */
        style={{ position: 'relative', zIndex: 1 }}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </>
  )
}
