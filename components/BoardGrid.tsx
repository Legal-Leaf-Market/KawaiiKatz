'use client'
import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useExclusions } from '@/hooks/useExclusions'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useTaste } from '@/hooks/useTaste'
import { board, fillBoardPages } from '@/lib/boards'
import { tasteBonus } from '@/lib/taste'
import { money, type Product } from '@/lib/data'
import { pinProductPage, pinGuide } from '@/lib/pinterest'
import { track } from '@/lib/pinterest-track'
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
  const { taste, record } = useTaste()

  const [added, setAdded] = useState<string | null>(null)
  const [page, setPage] = useState<Record<string, number>>({})
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [liked, setLiked] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')

  const b = board(slug)

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

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return null
    const hit = corpus.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        (p.character || '').toLowerCase().includes(q)
    )
    // Taste applies to the ORDER of results, never to which ones match. A
    // search that hides what you asked for because we guessed your taste is a
    // broken search.
    return hit
      .slice()
      .sort((x, y) => tasteBonus(taste, y) - tasteBonus(taste, x))
      .slice(0, 48)
  }, [q, corpus, taste])

  const visible = useCallback(
    (list: Product[]) => list.filter((p) => !excludedIds.has(p.id) && !hidden.has(p.id)),
    [excludedIds, hidden]
  )

  /**
   * What each section shows right now: its current page, backfilled from the
   * pages behind it so a thumbs-down leaves a gap for no longer than a frame.
   */
  const shown = useMemo(() => {
    const src =
      paged?.map((s) => ({
        key: s.section.key,
        title: s.section.title,
        blurb: s.section.blurb,
        pages: s.pages,
      })) ??
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
  }, [paged, sections, page, visible])

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
    record(p, 'down')
    setHidden((prev) => new Set(prev).add(p.id))
    setLiked((prev) => {
      if (!prev.has(p.id)) return prev
      const next = new Set(prev)
      next.delete(p.id)
      return next
    })
  }

  function thumbUp(p: Product) {
    record(p, 'up')
    setLiked((prev) => new Set(prev).add(p.id))
  }

  function shuffle(key: string, pageCount: number) {
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

      {hidden.size > 0 && (
        <p className="text-[12.5px] font-bold text-[#9a8fa3] mb-5">
          {hidden.size} hidden ·{' '}
          <button onClick={() => setHidden(new Set())} className="underline hover:text-[#ff8a65]">
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
            Searching all {total} products in this collection, not just the ones on show.
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
                  title={`${s.poolSize} in this section — show me different ones`}
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
    return <p className="text-[#9a8fa3] font-bold py-4">Nothing left here — try shuffling or clearing what you hid.</p>
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
                  title="Not for me — hide it and show fewer like it"
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
