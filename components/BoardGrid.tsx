'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useExclusions } from '@/hooks/useExclusions'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useTaste } from '@/hooks/useTaste'
import { board, dealPages, fillBoardPages, vendorCap } from '@/lib/boards'
import { tasteBonus, totalSignals } from '@/lib/taste'
import { money, type Product } from '@/lib/data'
import { pinProductPage, pinGuide } from '@/lib/pinterest'
import { track } from '@/lib/pinterest-track'
import { logEvent } from '@/lib/site-events'
import ProductImage from '@/components/ProductImage'

type Section = { key: string; title: string; blurb: string; products: Product[] }

type Props = {
  slug: string
  title: string
  tagline: string
  hashtag: string
  sections: Section[]
}

/**
 * The interactive half of a collection.
 *
 * -----------------------------------------------------------------------------
 * WHY THE CLIENT RECOMPUTES WHAT THE SERVER ALREADY SENT
 *
 * The server prerenders the first page of each section so a Pinterest scraper,
 * a search crawler and a visitor on a slow phone all get real products in the
 * HTML rather than a spinner. But a section is twelve tiles and the plushies
 * shelf is 567 products — a fixed shortlist is a dead end, not a way into the
 * catalogue.
 *
 * These pages ALREADY fetch the whole catalogue client-side: ProductPageChrome
 * calls useLiveCatalog() for the cart and Gift Finder, and SWR dedupes on the
 * key. So shuffling, searching and re-ranking are free — no extra request, no
 * extra bytes in the document. `lib/boards.ts` is pure and imports nothing
 * server-only, so the exact same selection rules run in the browser.
 *
 * Until that request lands, `live` is false and the server's sections are what
 * render — which is also what keeps hydration honest, since the first client
 * render must match the HTML byte for byte.
 *
 * -----------------------------------------------------------------------------
 * `allProducts`, NOT `products`
 *
 * useLiveCatalog() holds showcase vendors out of `products` because they have
 * their own page and would otherwise scatter through the home grid. A
 * collection is the opposite case: BRKOX is 43% of the blind-box shelf, and
 * dropping it on hydration would empty half the page the server just rendered.
 */
export default function BoardGrid({ slug, title, tagline, hashtag, sections }: Props) {
  const { state, dispatch } = useStore()
  const { excludedIds } = useExclusions()
  const { allProducts, live } = useLiveCatalog()
  const { taste, record, showHidden } = useTaste()

  // Which collections people actually open. page_view already records the path;
  // this carries the slug in `meta` so /admin can rank guides without parsing
  // URLs, and so a renamed route does not orphan its own history.
  useEffect(() => {
    logEvent('collection_view', { meta: slug })
  }, [slug])

  const [added, setAdded] = useState<string | null>(null)
  const [page, setPage] = useState<Record<string, number>>({})
  const [liked, setLiked] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [kidOnly, setKidOnly] = useState(false)
  const [range, setRange] = useState<[number, number] | null>(null)
  const [surprise, setSurprise] = useState<Product | null>(null)

  const b = board(slug)

  /**
   * Hidden lives in the taste profile now, so it survives a reload.
   *
   * Read through useSyncExternalStore rather than local state: a thumbs-down
   * on this page and one in the Gift Finder write the same store, and two
   * copies of the truth would disagree the moment a visitor used both.
   */
  const hidden = useMemo(() => new Set(taste.hidden), [taste.hidden])

  /** Every page of every section, once the catalogue is here. */
  const paged = useMemo(() => {
    if (!b || !live || !allProducts.length) return null
    return fillBoardPages(b, allProducts)
  }, [b, live, allProducts])

  /**
   * Everything this collection could ever show — the search corpus.
   *
   * Search runs over the whole eligible set rather than the tiles on screen,
   * which is the point: "search our whole collection" means all 240 plushies,
   * not the 40 the sections happened to pick.
   */
  const corpus = useMemo(() => {
    if (!paged) return sections.flatMap((s) => s.products)
    return paged.flatMap((s) => s.pages.flat())
  }, [paged, sections])

  /** The collection's real price span, so the slider fits the shelf it is on. */
  const bounds = useMemo((): [number, number] => {
    if (!corpus.length) return [0, 100]
    const prices = corpus.map((p) => p.price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [corpus])

  const priceActive = !!range && (range[0] > bounds[0] || range[1] < bounds[1])

  /**
   * Kid-safe and price, applied everywhere — sections, search and Surprise Me.
   *
   * `kidSafe` is the positive-evidence flag set at scrape time (lib/kid-safe),
   * not the inverse of the adult filter. An item with no evidence either way is
   * not kid-safe, which is the right way round for a toggle a parent trusts.
   */
  const passes = useCallback(
    (p: Product) => {
      if (kidOnly && p.kidSafe !== true) return false
      if (range && (p.price < range[0] || p.price > range[1])) return false
      return true
    },
    [kidOnly, range]
  )

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return null
    const hit = corpus.filter(
      (p) =>
        passes(p) &&
        (p.name.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        (p.character || '').toLowerCase().includes(q))
    )
    // Taste applies to the ORDER of results, never to which ones match. A
    // search that hides what you asked for because we guessed your taste is a
    // broken search.
    return hit
      .slice()
      .sort((x, y) => tasteBonus(taste, y) - tasteBonus(taste, x))
      .slice(0, 48)
  }, [q, corpus, taste, passes])

  const visible = useCallback(
    (list: Product[]) => list.filter((p) => !excludedIds.has(p.id) && !hidden.has(p.id) && passes(p)),
    [excludedIds, hidden, passes]
  )

  /**
   * What each section shows right now: its current page, backfilled from the
   * pages behind it so a thumbs-down leaves a gap for no longer than a frame.
   */
  const learned = totalSignals(taste) >= 3

  const shown = useMemo(() => {
    const cap = b ? vendorCap(b) : 3
    const src =
      paged?.map((s) => {
        /**
         * Once a visitor has told us something, shuffle stops being a walk
         * through a fixed running order and becomes a re-rank.
         *
         * The pool is re-ordered by tasteBonus and dealt again — through
         * dealPages, so the per-vendor cap travels with it. Taste ordering
         * makes a one-shop page MORE likely, not less: someone who liked one
         * thing from a shop ranks that shop's whole shelf.
         *
         * Below the threshold the sort is a no-op (every bonus is 0) and the
         * server's running order is preserved exactly, which is what keeps the
         * first paint and the first client render identical.
         */
        if (!learned) return { key: s.section.key, title: s.section.title, blurb: s.section.blurb, pages: s.pages }
        const size = s.pages[0].length
        const pool = s.pages
          .flat()
          .slice()
          .sort((x, y) => tasteBonus(taste, y) - tasteBonus(taste, x))
        return {
          key: s.section.key,
          title: s.section.title,
          blurb: s.section.blurb,
          pages: dealPages(pool, size, cap, s.pages.length),
        }
      }) ??
      sections.map((s) => ({ key: s.key, title: s.title, blurb: s.blurb, pages: [s.products] }))

    return src
      .map((s) => {
        const idx = (page[s.key] ?? 0) % s.pages.length
        const size = s.pages[0].length
        const primary = visible(s.pages[idx])
        // Backfill in page order from the rest, so replacements are the next
        // best products rather than whatever is adjacent in the array.
        const rest = s.pages.filter((_, i) => i !== idx).flat()
        const fill = visible(rest).filter((p) => !primary.some((x) => x.id === p.id))
        return {
          ...s,
          items: [...primary, ...fill].slice(0, size),
          pageCount: s.pages.length,
          pageIndex: idx,
          poolSize: s.pages.flat().length,
        }
      })
      .filter((s) => s.items.length > 0)
  }, [paged, sections, page, visible, learned, taste, b])

  const cover = shown[0]?.items[0]
  const total = corpus.length

  function addToCart(p: Product) {
    dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex: 0 })
    record(p, 'cart')
    setAdded(p.id)
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1600)
  }

  /**
   * Thumbs down is also "get it off my screen".
   *
   * Two controls for one intention would be two things to explain. A visitor
   * who does not want NASCAR plushies wants them gone AND wants fewer like
   * them, and one press says both: the tile goes, the next candidate slides in,
   * and the taste profile learns from it for the shuffle after this one.
   */
  function thumbDown(p: Product) {
    logEvent('taste_down', { productId: p.id, vendor: p.vendor, cat: p.cat, meta: slug })
    // record() folds the id into taste.hidden and persists it, so there is no
    // second piece of state to keep in step.
    record(p, 'down')
    setLiked((prev) => {
      if (!prev.has(p.id)) return prev
      const next = new Set(prev)
      next.delete(p.id)
      return next
    })
  }

  function thumbUp(p: Product) {
    logEvent('taste_up', { productId: p.id, vendor: p.vendor, cat: p.cat, meta: slug })
    record(p, 'up')
    setLiked((prev) => new Set(prev).add(p.id))
  }

  /**
   * One product, at random, from everything the current filters allow.
   *
   * Math.random() is safe here in a way it is not in the ranking: this runs on
   * a click, long after hydration, and starts as null so the server and the
   * first client render agree. The ranking cannot use it — those pages
   * prerender, and a random order there is a hydration mismatch.
   */
  function surpriseMe() {
    logEvent('surprise_me', { meta: slug })
    const pool = visible(corpus)
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setSurprise(pick)
    record(pick, 'skip') // shown and not yet chosen; a nudge, not a verdict
    track({ event_name: 'view_category', custom_data: { product_category: `${slug}/surprise` } })
  }

  function shuffle(key: string, pageCount: number) {
    logEvent('shuffle', { meta: `${slug}/${key}` })
    // Everything currently on screen in this section counts as "seen and not
    // chosen" — a weak negative, so a visitor who keeps shuffling past the same
    // sort of thing stops being shown it.
    const sec = shown.find((s) => s.key === key)
    sec?.items.forEach((p) => record(p, 'skip'))
    setPage((prev) => ({ ...prev, [key]: ((prev[key] ?? 0) + 1) % Math.max(pageCount, 1) }))
    track({ event_name: 'view_category', custom_data: { product_category: `${slug}/${key}` } })
  }

  return (
    <>
      {/* Search + pin, above everything */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        {cover && (
          <button
            type="button"
            onClick={() => pinGuide({ slug, title, tagline, tag: hashtag, cover })}
            className="border-[3px] border-[#e60023] bg-[#e60023] text-white font-display font-extrabold px-4 py-2.5 rounded-full cursor-pointer text-[14px] hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            title="Pin this whole guide to one of your boards"
          >
            📌 Pin this guide
          </button>
        )}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={live ? `Search all ${total} in this collection…` : 'Search this collection…'}
            className="w-full border-[3px] border-[#ffb199] bg-white rounded-full px-[18px] py-[10px] pr-11 font-sans font-semibold text-[#4f4550] outline-none focus:border-[#7fc4d4]"
            aria-label="Search this collection"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xl text-[#9a8fa3]"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filters. Only rendered once the catalogue is here — a price slider
          over the forty products the server sent would be lying about range. */}
      {live && corpus.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 mb-4 p-3 rounded-[18px] bg-[#fffaf0] border-2 border-[#ffe6d9]">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={kidOnly}
              onChange={(e) => setKidOnly(e.target.checked)}
              className="w-[18px] h-[18px] accent-[#7fc4d4] cursor-pointer"
            />
            <span className="font-display font-extrabold text-[13.5px] text-[#4f4550]">
              🧒 Kid-safe only
            </span>
          </label>

          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <span className="font-display font-extrabold text-[13.5px] text-[#4f4550] whitespace-nowrap">
              {money(range?.[0] ?? bounds[0])} – {money(range?.[1] ?? bounds[1])}
            </span>
            <div className="flex-1 flex flex-col gap-0.5 min-w-[120px]">
              <input
                type="range"
                min={bounds[0]}
                max={bounds[1]}
                value={range?.[0] ?? bounds[0]}
                onChange={(e) => {
                  const lo = Number(e.target.value)
                  // A destructuring default would not cover this: `range` is
                  // null until first touched, and defaults only fill undefined.
                  setRange((prev) => {
                    const [, hi] = prev ?? bounds
                    return [Math.min(lo, hi), hi]
                  })
                }}
                className="w-full accent-[#ff8a65] cursor-pointer"
                aria-label="Minimum price"
              />
              <input
                type="range"
                min={bounds[0]}
                max={bounds[1]}
                value={range?.[1] ?? bounds[1]}
                onChange={(e) => {
                  const hi = Number(e.target.value)
                  setRange((prev) => {
                    const [lo] = prev ?? bounds
                    return [lo, Math.max(hi, lo)]
                  })
                }}
                className="w-full accent-[#ff8a65] cursor-pointer"
                aria-label="Maximum price"
              />
            </div>
            {priceActive && (
              <button
                onClick={() => setRange(null)}
                className="text-[12px] font-bold text-[#9a8fa3] underline hover:text-[#ff8a65] whitespace-nowrap"
              >
                any price
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={surpriseMe}
            className="border-[2.5px] border-[#7fc4d4] bg-white text-[#4f4550] font-display font-extrabold px-3.5 py-2 rounded-full cursor-pointer text-[13px] hover:bg-[#bfe3ea] transition-colors whitespace-nowrap"
          >
            🎲 Surprise me
          </button>
        </div>
      )}

      {surprise && (
        <div className="mb-6 flex gap-4 items-center flex-wrap sm:flex-nowrap p-3 rounded-[22px] border-[3px] border-[#7fc4d4] bg-white shadow-[0_4px_12px_rgba(127,196,212,.22)]">
          <Link href={`/p/${surprise.id}`} className="relative block w-[120px] h-[150px] flex-none rounded-[16px] overflow-hidden bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]">
            <ProductImage
              src={surprise.image}
              alt={surprise.name}
              fallback="🎲"
              className="w-full h-full object-cover"
              fallbackClassName="absolute inset-0 flex items-center justify-center text-[40px]"
              width={240}
            />
          </Link>
          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <div className="text-[10.5px] font-extrabold uppercase tracking-[.7px] text-[#7fc4d4]">
              🎲 How about this
            </div>
            <Link href={`/p/${surprise.id}`} className="font-display font-extrabold text-[17px] leading-tight hover:underline">
              {surprise.name}
            </Link>
            <div className="font-display text-[19px] text-[#ff8a65]">{money(surprise.price)}</div>
            <div className="flex gap-2 flex-wrap mt-1">
              <button
                onClick={() => addToCart(surprise)}
                className="border-2 border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold rounded-xl px-3.5 py-2 cursor-pointer text-[13px] hover:bg-[#ff8a65] hover:text-white transition-colors"
              >
                {added === surprise.id ? 'Added ✓' : 'Add 🎀'}
              </button>
              <button
                onClick={() => pinProductPage(surprise, { tag: hashtag })}
                className="border-2 border-[#e60023] bg-white text-[#e60023] rounded-xl px-3 py-2 cursor-pointer text-[13px] hover:bg-[#e60023] hover:text-white transition-colors"
              >
                📌 Pin
              </button>
              <button
                onClick={surpriseMe}
                className="border-2 border-[#7fc4d4] bg-white text-[#4f4550] font-display font-extrabold rounded-xl px-3.5 py-2 cursor-pointer text-[13px] hover:bg-[#bfe3ea] transition-colors"
              >
                🎲 Again
              </button>
              <button
                onClick={() => { thumbDown(surprise); setSurprise(null) }}
                className="border-2 border-[#ffd6de] bg-white text-[#ff5a7a] rounded-xl px-3 py-2 cursor-pointer text-[13px] hover:bg-[#ffd6de] transition-colors"
                title="Not for me, hide it and show fewer like it"
              >
                👎
              </button>
              <button
                onClick={() => setSurprise(null)}
                className="text-[12.5px] font-bold text-[#9a8fa3] underline hover:text-[#ff8a65] px-1"
              >
                close
              </button>
            </div>
          </div>
        </div>
      )}

      {hidden.size > 0 && (
        <p className="text-[12.5px] font-bold text-[#9a8fa3] mb-5">
          {hidden.size} hidden{learned ? ' · shuffle is using what you told us' : ''} ·{' '}
          <button onClick={() => showHidden()} className="underline hover:text-[#ff8a65]">
            show them again
          </button>
        </p>
      )}

      {results ? (
        <section className="mb-10">
          <h2 className="font-display font-extrabold text-[22px] text-[#4f4550]">
            {results.length} match{results.length === 1 ? '' : 'es'} for “{query}”
          </h2>
          <p className="text-[14px] text-[#9a8fa3] font-semibold mt-0.5 mb-4">
            Searching all {total} products in this collection, not just the ones on show
            {kidOnly || priceActive ? ', within your filters' : ''}.
          </p>
          <Grid
            items={visible(results)}
            liked={liked}
            added={added}
            wish={state.wish}
            hashtag={hashtag}
            onAdd={addToCart}
            onUp={thumbUp}
            onDown={thumbDown}
            onWish={(p) => dispatch({ type: 'TOGGLE_WISH', productId: p.id })}
          />
        </section>
      ) : shown.length === 0 ? (
        /* Filters can empty every section at once — kid-safe on a shelf with
           little kid-safe stock, or a narrow price window. A blank page with no
           explanation reads as broken, so say what happened and offer the way
           back. */
        <p className="text-[#9a8fa3] font-bold py-6">
          Nothing matches those filters.{' '}
          <button
            onClick={() => { setKidOnly(false); setRange(null) }}
            className="underline hover:text-[#ff8a65]"
          >
            Clear them
          </button>
          {hidden.size > 0 && (
            <>
              {' '}or{' '}
              <button onClick={() => showHidden()} className="underline hover:text-[#ff8a65]">
                unhide the {hidden.size} you hid
              </button>
            </>
          )}
          .
        </p>
      ) : (
        shown.map((s) => (
          <section key={s.key} id={s.key} className="mb-10 scroll-mt-24">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display font-extrabold text-[22px] sm:text-[26px] text-[#4f4550] leading-tight">
                  {s.title}
                </h2>
                <p className="text-[14px] text-[#9a8fa3] font-semibold mt-0.5 max-w-[62ch]">{s.blurb}</p>
              </div>
              {s.pageCount > 1 && (
                <button
                  type="button"
                  onClick={() => shuffle(s.key, s.pageCount)}
                  className="border-[2.5px] border-[#b79cff] bg-white text-[#b79cff] font-display font-extrabold px-3.5 py-2 rounded-full cursor-pointer text-[13px] hover:bg-[#b79cff] hover:text-white transition-colors whitespace-nowrap"
                  title={`${s.poolSize} in this section. Show me different ones`}
                >
                  ↻ Shuffle <span className="opacity-70">{s.pageIndex + 1}/{s.pageCount}</span>
                </button>
              )}
            </div>
            <div className="mt-4">
              <Grid
                items={s.items}
                liked={liked}
                added={added}
                wish={state.wish}
                hashtag={hashtag}
                onAdd={addToCart}
                onUp={thumbUp}
                onDown={thumbDown}
                onWish={(p) => dispatch({ type: 'TOGGLE_WISH', productId: p.id })}
              />
            </div>
          </section>
        ))
      )}
    </>
  )
}

function Grid({
  items, liked, added, wish, hashtag, onAdd, onUp, onDown, onWish,
}: {
  items: Product[]
  liked: Set<string>
  added: string | null
  wish: string[]
  hashtag: string
  onAdd: (p: Product) => void
  onUp: (p: Product) => void
  onDown: (p: Product) => void
  onWish: (p: Product) => void
}) {
  if (!items.length) {
    return <p className="text-[#9a8fa3] font-bold py-4">Nothing left here. Try shuffling or clearing what you hid.</p>
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
      {items.map((p) => {
        const inWish = wish.includes(p.id)
        const isLiked = liked.has(p.id)
        return (
          <div
            key={p.id}
            className={`bg-white border-[3px] rounded-[20px] overflow-hidden shadow-[0_4px_12px_rgba(255,138,101,.18)] flex flex-col transition-colors ${isLiked ? 'border-[#2e7d32]' : 'border-[#ffb199]'}`}
          >
            <Link href={`/p/${p.id}`} className="block relative aspect-[4/5] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]">
              <ProductImage
                src={p.image}
                alt={p.name}
                fallback="🎁"
                className="w-full h-full object-cover"
                fallbackClassName="absolute inset-0 flex items-center justify-center text-[46px]"
                width={320}
              />
              {p.onSale && (
                <span className="absolute top-2 left-2 bg-[#e0227a] text-white border-2 border-white rounded-full font-display font-extrabold text-[10px] px-2 py-[3px]">
                  sale
                </span>
              )}
            </Link>

            <div className="p-2.5 px-3 flex flex-col gap-1.5 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-[.6px] text-[#b79cff] truncate">{p.vendor}</div>
              <Link href={`/p/${p.id}`} className="font-display font-extrabold text-[13.5px] leading-tight line-clamp-2 hover:underline">
                {p.name}
              </Link>
              <div className={`font-display text-[17px] ${p.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
                {p.unit && <span className="text-[12px] font-bold mr-1">{p.unit}</span>}
                {money(p.price)}
              </div>

              {/* Taste row. Thumbs down removes the tile — see thumbDown(). */}
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onUp(p)}
                  className={`flex-1 border-2 rounded-xl py-1.5 cursor-pointer text-[13px] transition-colors ${
                    isLiked
                      ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
                      : 'border-[#c9ecd2] bg-white text-[#2e7d32] hover:bg-[#c9ecd2]'
                  }`}
                  aria-label={`More like ${p.name}`}
                  title="More like this"
                >
                  {isLiked ? '👍 liked' : '👍'}
                </button>
                <button
                  type="button"
                  onClick={() => onDown(p)}
                  className="flex-1 border-2 border-[#ffd6de] bg-white text-[#ff5a7a] rounded-xl py-1.5 cursor-pointer text-[13px] hover:bg-[#ffd6de] transition-colors"
                  aria-label={`Hide ${p.name} and show fewer like it`}
                  title="Not for me, hide it and show fewer like it"
                >
                  👎
                </button>
              </div>

              <div className="flex gap-1.5 mt-auto pt-1">
                <button
                  type="button"
                  onClick={() => onAdd(p)}
                  className={`flex-1 border-2 font-display font-extrabold rounded-xl py-2 cursor-pointer text-[12.5px] transition-colors ${
                    added === p.id
                      ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
                      : 'border-[#ff8a65] bg-[#ffb199] text-[#4f4550] hover:bg-[#ff8a65] hover:text-white'
                  }`}
                >
                  {added === p.id ? 'Added ✓' : 'Add 🎀'}
                </button>
                <button
                  type="button"
                  onClick={() => onWish(p)}
                  className={`flex-none border-2 border-[#ff5a7a] ${inWish ? 'bg-[#ff5a7a] text-white' : 'bg-white text-[#ff5a7a]'} rounded-xl w-9 cursor-pointer text-[15px] flex items-center justify-center`}
                  aria-label={inWish ? 'Remove from My Board' : 'Save to My Board'}
                >
                  {inWish ? '♥' : '♡'}
                </button>
                <button
                  type="button"
                  onClick={() => pinProductPage(p, { tag: hashtag })}
                  className="flex-none border-2 border-[#e60023] bg-white text-[#e60023] rounded-xl w-9 cursor-pointer text-[14px] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
                  aria-label={`Pin ${p.name} to Pinterest`}
                  title="Pin this"
                >
                  📌
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
