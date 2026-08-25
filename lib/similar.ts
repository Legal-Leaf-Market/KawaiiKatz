import type { Product } from './data'
import { tasteBonus, type TasteProfile } from './taste'

/**
 * "More like this" ranking for the flip side of a product card.
 *
 * Deliberately pure and deterministic: a card renders on the server for first
 * paint and again on the client during hydration, so anything built on
 * `Math.random()` here would mismatch. Shuffling walks down this ranking
 * instead of re-rolling it, so each press shows something not yet seen.
 */

/** Words that say nothing about what a product IS, so they must not score. */
const STOP = new Set([
  'the', 'and', 'with', 'for', 'a', 'an', 'of', 'in', 'on', 'to', 'by', 'set',
  'pack', 'new', 'cute', 'kawaii', 'super', 'mini', 'large', 'small', 'size',
  'style', 'color', 'colour', 'gift', 'free', 'shipping', 'sale', 'plus',
])

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
}

/** How close two prices are, 0 (far) → 1 (same). Ratio-based so $4 vs $8 is as
 *  distant as $40 vs $80 — which is how a gift budget actually feels. */
function priceAffinity(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0
  const ratio = a > b ? b / a : a / b
  return ratio < 0.4 ? 0 : (ratio - 0.4) / 0.6
}

export type Scored = { product: Product; score: number }

/**
 * Rank `pool` by how good a substitute each item is for `target`.
 *
 * Capped at `limit` because the whole point is a shortlist to page through;
 * scoring ~1,600 products is cheap, holding all of them is not.
 */
export function rankSimilar(
  target: Product,
  pool: Product[],
  limit = 24,
  taste?: TasteProfile | null,
): Product[] {
  const tTokens = new Set(tokens(target.name))
  const scored: Scored[] = []

  for (const c of pool) {
    if (c.id === target.id) continue
    if (!c.image) continue

    let score = 0
    if (c.cat === target.cat) score += 3
    if (target.character && c.character === target.character) score += 4
    score += priceAffinity(target.price, c.price) * 3

    let overlap = 0
    for (const t of tokens(c.name)) if (tTokens.has(t)) overlap++
    score += Math.min(overlap, 3) * 1.2

    // A nudge, not a rule: same vendor means one checkout instead of two, but
    // "more options" is worth more than convenience, so it stays small.
    if (c.vendor === target.vendor) score += 0.4
    if (c.onSale) score += 0.3

    // Note the filter is on the *similarity* score alone. Learned taste is
    // applied below, never here — a run of thumbs-down must be able to reorder
    // the shortlist but never to empty it.
    if (score <= 0) continue
    scored.push({ product: c, score })
  }

  // Tie-break on id so the order is identical on server and client.
  scored.sort((a, b) => b.score - a.score || (a.product.id < b.product.id ? -1 : 1))
  if (!taste) return scored.slice(0, limit).map((s) => s.product)

  // Rank a window rather than the whole pool: taste should reorder plausible
  // matches, not promote something unrelated because its category scored well.
  const window = scored.slice(0, Math.max(limit * 2, 40))
  const adjusted = [...window].sort((a, b) => {
    const d = (b.score + tasteBonus(taste, b.product)) - (a.score + tasteBonus(taste, a.product))
    return d || (a.product.id < b.product.id ? -1 : 1)
  })

  // The last quarter of the shortlist is reserved for the best *unadjusted*
  // matches that taste pushed out. Without it a confident profile narrows to
  // one thing and the finder stops finding; with it there is always something
  // to discover further down the shuffle.
  const keep = Math.max(1, Math.floor(limit * 0.75))
  const out = adjusted.slice(0, keep)
  const seen = new Set(out.map((s) => s.product.id))
  for (const s of window) {
    if (out.length >= limit) break
    if (seen.has(s.product.id)) continue
    out.push(s)
    seen.add(s.product.id)
  }
  return out.map((s) => s.product)
}
