'use client'
import { useCallback, useSyncExternalStore } from 'react'
import { EMPTY_TASTE, applySignal, type TasteProfile, type TasteSignal } from '@/lib/taste'
import type { Product } from '@/lib/data'

/**
 * The visitor's taste profile, shared by every card and the Gift Finder.
 *
 * A module-level store rather than a context because the profile is genuinely
 * global — a thumbs-down given on a card back has to count towards the nudge
 * the Gift Finder shows, and threading a provider through both for one object
 * buys nothing.
 *
 * Anonymous and device-local: no account, no cookie, nothing leaves the
 * browser. `localStorage` is the whole backing store.
 */

const KEY = 'kk_taste_v1'

let profile: TasteProfile = EMPTY_TASTE
let loaded = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function load(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as Partial<TasteProfile>
    profile = {
      cat: saved.cat ?? {},
      vendor: saved.vendor ?? {},
      character: saved.character ?? {},
      band: saved.band ?? {},
      counts: { ...EMPTY_TASTE.counts, ...(saved.counts ?? {}) },
    }
  } catch {
    /* corrupt or unavailable storage: start clean rather than break the page */
  }
}

function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(profile)) } catch { /* ignore */ }
}

/**
 * React subscribes in an effect, which is after hydration — so reading storage
 * here cannot desync the server HTML from the first client render. That is why
 * `getServerSnapshot` can safely return the empty profile.
 */
function subscribe(cb: () => void): () => void {
  load()
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

function getSnapshot(): TasteProfile { return profile }
function getServerSnapshot(): TasteProfile { return EMPTY_TASTE }

export function useTaste() {
  const taste = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  /**
   * Records one signal and returns the profile it produced. Callers need the
   * new profile synchronously — a thumbs-down has to re-rank and swap the tile
   * in the same tick, and React state would still be a render behind.
   */
  const record = useCallback((product: Product, signal: TasteSignal): TasteProfile => {
    load()
    profile = applySignal(profile, product, signal)
    save()
    emit()
    return profile
  }, [])

  const reset = useCallback((): void => {
    loaded = true
    profile = EMPTY_TASTE
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    emit()
  }, [])

  return { taste, record, reset }
}
