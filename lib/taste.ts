import { PRICE_BUCKETS, type Product } from './data'

/**
 * What the gift finder learns from a visitor, and how much each thing they do
 * is worth.
 *
 * Signals are weighted by what they cost the person giving them. A thumbs-down
 * is one tap and people give a lot of them; adding something to a cart is the
 * whole point of the site and almost nobody does it by accident. Skipping past
 * a suggestion with the shuffle button is the weakest of all — it means "not
 * that one right now", not "never show me this again" — so it is worth a
 * fraction of a real rejection.
 *
 * Nothing here is per-product. A signal is decomposed into the *attributes* of
 * the product it landed on, which is what lets one thumbs-down on a $52 blanket
 * hoodie steer away from the other eleven blanket hoodies without the visitor
 * having to reject each one.
 *
 * Pure and dependency-free on purpose: no storage, no React, no clock. The hook
 * owns persistence, `rankSimilar` owns the ranking, and this file owns only the
 * arithmetic — which makes it the one part that can be reasoned about directly.
 */

export type TasteSignal = 'up' | 'down' | 'skip' | 'cart'

export const SIGNAL_WEIGHT: Record<TasteSignal, number> = {
  cart: 6,
  up: 3,
  down: -3,
  skip: -0.5,
}

/**
 * How strongly each attribute inherits a signal. Category is the thing a
 * visitor is really expressing an opinion about; vendor is mostly a proxy for
 * it (rejecting a Plushible item is rarely a verdict on Plushible), so it
 * learns more slowly.
 */
const ATTR_WEIGHT = { cat: 1, vendor: 0.6, character: 1, band: 0.8 }

/** How far a single attribute's opinion can go. Two thumbs-down on a category
 *  should steer; twenty should not make it unreachable forever. */
const CAP = 9

/** Ceiling on the whole taste adjustment, so it tilts the ranking rather than
 *  replacing it — a learned preference must never outrank actual similarity. */
const MAX_BONUS = 6

export type TasteProfile = {
  cat: Record<string, number>
  vendor: Record<string, number>
  character: Record<string, number>
  band: Record<string, number>
  counts: Record<TasteSignal, number>
  /**
   * Product ids the visitor has thumbed down, kept so they stay gone.
   *
   * It lives here rather than in a store of its own because it is the same
   * gesture: a thumbs-down on a collection tile means both "fewer like this"
   * and "not that one again", and one store means the existing reset button
   * clears both. Starting over should start over.
   *
   * Bounded — see HIDDEN_LIMIT. An unbounded list in localStorage is a slow
   * leak that only shows up on the devices of the people who use the site most.
   */
  hidden: string[]
}

/**
 * How many hidden ids to keep, newest first. Comfortably more than anyone
 * dismisses in a session, small enough that the stored profile stays a few KB.
 */
export const HIDDEN_LIMIT = 400

export const EMPTY_TASTE: TasteProfile = {
  cat: {}, vendor: {}, character: {}, band: {},
  counts: { up: 0, down: 0, skip: 0, cart: 0 },
  hidden: [],
}

export function priceBand(price: number): string {
  const b = PRICE_BUCKETS.find((x) => price >= x.min && price < x.max)
  return b ? b.key : PRICE_BUCKETS[0].key
}

function bump(map: Record<string, number>, key: string, delta: number): void {
  if (!key) return
  const next = (map[key] ?? 0) + delta
  map[key] = Math.max(-CAP, Math.min(CAP, next))
}

/** Fold one signal into a profile. Returns a new profile; never mutates. */
export function applySignal(profile: TasteProfile, product: Product, signal: TasteSignal): TasteProfile {
  const d = SIGNAL_WEIGHT[signal]
  const next: TasteProfile = {
    cat: { ...profile.cat },
    vendor: { ...profile.vendor },
    character: { ...profile.character },
    band: { ...profile.band },
    counts: { ...profile.counts, [signal]: (profile.counts[signal] ?? 0) + 1 },
    // A thumbs-down is a hide as well as an opinion. Newest first, deduped,
    // and bounded so the stored profile cannot grow without limit.
    hidden:
      signal === 'down'
        ? [product.id, ...profile.hidden.filter((id) => id !== product.id)].slice(0, HIDDEN_LIMIT)
        : profile.hidden,
  }
  bump(next.cat, product.cat, d * ATTR_WEIGHT.cat)
  bump(next.vendor, product.vendor, d * ATTR_WEIGHT.vendor)
  bump(next.character, product.character, d * ATTR_WEIGHT.character)
  bump(next.band, priceBand(product.price), d * ATTR_WEIGHT.band)
  return next
}

/** The adjustment `rankSimilar` adds to a candidate's similarity score. */
export function tasteBonus(profile: TasteProfile | null | undefined, p: Product): number {
  if (!profile) return 0
  let n = 0
  n += (profile.cat[p.cat] ?? 0) * 0.5
  n += (profile.vendor[p.vendor] ?? 0) * 0.35
  if (p.character) n += (profile.character[p.character] ?? 0) * 0.5
  n += (profile.band[priceBand(p.price)] ?? 0) * 0.4
  return Math.max(-MAX_BONUS, Math.min(MAX_BONUS, n))
}

/**
 * Puts a hidden product back.
 *
 * Only the id is dropped; the attribute weights the thumbs-down produced are
 * left alone. Un-hiding one plushie is "actually, show me that one", not "I was
 * wrong about plushies" — and we no longer hold the product, only its id, so
 * there is nothing to reverse the bump with even if we wanted to.
 */
export function unhide(profile: TasteProfile, id: string): TasteProfile {
  if (!profile.hidden.includes(id)) return profile
  return { ...profile, hidden: profile.hidden.filter((x) => x !== id) }
}

export function clearHidden(profile: TasteProfile): TasteProfile {
  return profile.hidden.length ? { ...profile, hidden: [] } : profile
}

export function totalSignals(profile: TasteProfile): number {
  const c = profile.counts
  return c.up + c.down + c.skip + c.cart
}

/** True once someone has shown enough frustration to be worth asking. */
export function shouldNudge(profile: TasteProfile): boolean {
  return profile.counts.skip >= 3 || profile.counts.down >= 2
}

/** True once the profile is actually steering anything, so the UI can say so. */
export function isLearning(profile: TasteProfile): boolean {
  return profile.counts.up + profile.counts.down + profile.counts.cart > 0
}
