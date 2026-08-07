'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Horizontal carousel controller. Returns a ref to attach to the scroll
 * container plus scroll handlers and edge state for prev/next arrow buttons.
 */
export function useCarousel<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanPrev(scrollLeft > 4)
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  const scrollByAmount = useCallback((dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    // Scroll by ~80% of the visible width for a paged feel
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  const prev = useCallback(() => scrollByAmount(-1), [scrollByAmount])
  const next = useCallback(() => scrollByAmount(1), [scrollByAmount])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Re-measure after content/images settle
    const t = setTimeout(update, 300)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      clearTimeout(t)
    }
  }, [update])

  return { ref, canPrev, canNext, prev, next, update }
}
