'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  src: string
  alt: string
  /** Emoji shown only after all retries are exhausted. */
  fallback: string
  className?: string
  fallbackClassName?: string
}

/**
 * Product image with automatic retry and a skeleton placeholder.
 *
 * Vendor images are proxied through /api/img, which can return a transient 502
 * on a cold cache or when Shopify's CDN briefly rate-limits us, and can be slow
 * on the first request. To avoid the browser flashing the `alt` text (the
 * product name) while the image downloads, we:
 *   - render the <img> with opacity 0 and an empty alt (the product name is
 *     already shown as real text in the card), so no text ever appears; and
 *   - show an animated shimmer skeleton behind it until it finishes loading,
 *     then fade the image in.
 * On repeated failure we retry a few times with backoff before dropping to the
 * category emoji fallback.
 */
export default function ProductImage({ src, alt, fallback, className, fallbackClassName }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const MAX_RETRIES = 4

  // Reset when the source changes (e.g. seed -> live catalog hydration).
  useEffect(() => {
    setAttempt(0)
    setFailed(false)
    setLoaded(false)
  }, [src])

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

  // Cache-bust each retry so the browser actually re-requests.
  const url = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}_r=${attempt}`

  return (
    <>
      {/* Shimmer skeleton shown until the image finishes loading */}
      {!loaded && (
        <span
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/[0.06] to-black/[0.12]"
          aria-hidden="true"
        />
      )}
      <img
        key={attempt}
        src={url || '/placeholder.svg'}
        /* Empty alt so the browser never paints the product name while the
           bytes are still downloading — the name is shown as text elsewhere. */
        alt=""
        aria-hidden="true"
        className={className}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease' }}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt < MAX_RETRIES) {
            const delay = 500 * (attempt + 1)
            timer.current = setTimeout(() => setAttempt((a) => a + 1), delay)
          } else {
            setFailed(true)
          }
        }}
      />
    </>
  )
}
