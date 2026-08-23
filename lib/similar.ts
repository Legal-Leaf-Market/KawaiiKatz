import type { Product } from './data'

/**
 * "More like this" ranking for the flip side of a product card.
 *
 * Deliberately pure and deterministic: a card renders on the server for first
 * paint and again on the client during hydration, so anything built on
 * `Math.random()` here would mismatch. Shuffling is done by *walking* a stable
 * ranked list (see `pairAt`) rather than reshuffling it.
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

/** How close two prices are, 0 (far) → 1 (same). Ratio-based so £4 vs £8 is as
 *  distant as £40 vs £80 — which is how a gift budget actually feels. */
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
export function rankSimilar(target: Product, pool: Product[], limit = 24): Product[] {
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

    if (score <= 0) continue
    scored.push({ product: c, score })
  }

  // Tie-break on id so the order is identical on server and client.
  scored.sort((a, b) => b.score - a.score || (a.product.id < b.product.id ? -1 : 1))
  return scored.slice(0, limit).map((s) => s.product)
}

/**
 * The `n`th pair from a ranked list. Walking two at a time means the shuffle
 * button steps *down* the ranking rather than re-rolling it, so every press
 * shows something the visitor has not seen yet until the list wraps.
 */
export function pairAt(ranked: Product[], n: number): Product[] {
  if (ranked.length === 0) return []
  if (ranked.length === 1) return [ranked[0]]
  const len = ranked.length
  const a = ranked[(n * 2) % len]
  const b = ranked[(n * 2 + 1) % len]
  return a.id === b.id ? [a] : [a, b]
}
