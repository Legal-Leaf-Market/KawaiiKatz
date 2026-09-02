'use client'
import { useEffect, useMemo, useState } from 'react'

import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { usePicks } from '@/hooks/usePicks'
import { useStore } from '@/lib/store'
import { animePool, animeSectionIndex, animeSectionPin, fillAnimePages } from '@/lib/anime'
import { pinCollection } from '@/lib/pinterest'
import { logEvent } from '@/lib/site-events'
import type { Product } from '@/lib/data'
import ProductCard from '@/components/ProductCard'
import AdaLoginModal, { ADA_SECRET_CODE } from '@/components/AdaLoginModal'
import s from './anime.module.css'

/**
 * The shelves.
 *
 * -----------------------------------------------------------------------------
 * IT HOLDS STATE NOW, AND THE ARITHMETIC IS WHY
 *
 * The first version was deliberately stateless: it mapped sections to shelves
 * and stopped, on the reasoning that copying /decora's shape would ship a
 * thousand lines of behaviour to render a list. That was right for a room with
 * nothing in it and wrong the moment the shops landed. Six shelves capped at
 * twelve is 72 slots, and the three live shops carry 1,441 products between
 * them, so 95% of the room could not be reached. That is the same arithmetic
 * that put Shuffle and Load more on /decora, and it is not a taste question.
 *
 * Three things came with it, all of them things /decora already had and this
 * page had no version of:
 *
 *   SHUFFLE AND LOAD MORE, per shelf. They do different jobs on purpose: Load
 *   more GROWS the shelf and keeps what you were looking at, Shuffle SWAPS it
 *   for a slice the same size you have not seen. Both wrap, so a shelf can be
 *   walked round and round.
 *
 *   PIN BUTTONS. One for the room, one per shelf, one per tile, in this room's
 *   own voice. Pinterest is the only bulk channel open to this site (§4e) and
 *   the room had no way onto it at all.
 *
 *   ADA MODE. This shelf is 715 jackets and a wardrobe of kimono, which is the
 *   exact argument that put the curator's controls on /decora: the automatic
 *   filters are a backstop and not a verdict, and a curator who can only hide
 *   something from the home grid cannot actually hide it.
 *
 * -----------------------------------------------------------------------------
 * NOTHING NON-SERIALISABLE CROSSES THE BOUNDARY, AND NOW NOTHING CROSSES AT ALL
 *
 * The original note here is still worth keeping, because the bug it records is
 * a real one: passing a section with its `match` function broke the production
 * build outright, and only on the first deploy where the shelves had something
 * on them, because with no products the page renders its empty state and never
 * mounts the client.
 *
 * This version cannot hit it by construction. The client imports the library
 * and does its own filling from the live catalogue, exactly as DecoraClient
 * does, so the only thing crossing the boundary is `Product[]`. `fillAnime`
 * still returns the matcher-free `AnimeSectionView`, so the server's own render
 * is unchanged and the type still refuses a function.
 */
export default function AnimeClient({ initialProducts }: { initialProducts: Product[] }) {
  const { products: live } = useLiveCatalog(initialProducts)
  const { excludedIds, exclude, restore } = useExclusions()
  const { pickedIds, togglePick } = usePicks()
  const { state } = useStore()
  const [adaLoginOpen, setAdaLoginOpen] = useState(false)

  /** Same hidden keydown buffer as the home page and /decora. There is no search
      box on this page to type it into, so the listener is the only route in. */
  useEffect(() => {
    let buf = ''
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const k = e.key || ''
      if (k.length !== 1 || !/[a-z]/i.test(k)) return
      buf = (buf + k.toLowerCase()).slice(-ADA_SECRET_CODE.length)
      if (buf === ADA_SECRET_CODE) { buf = ''; setAdaLoginOpen(true) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggleExclude(p: Product, currentlyExcluded: boolean) {
    if (currentlyExcluded) restore(p.id)
    else exclude(p)
  }

  /** In Ada Mode the excluded rows STAY, marked, exactly as on the home grid. A
      curator who cannot see what she hid cannot restore it. */
  const visible = useMemo(
    () => (state.adaMode ? live : live.filter((p) => !excludedIds.has(p.id))),
    [live, excludedIds, state.adaMode]
  )

  const sections = useMemo(() => fillAnimePages(visible), [visible])
  const pool = useMemo(() => animePool(visible), [visible])
  const shelfOfProduct = useMemo(() => animeSectionIndex(visible), [visible])
  const pinFor = (p: Product) => animeSectionPin(shelfOfProduct.get(p.id) ?? 'new')

  /**
   * How much of each shelf is on screen, per section key.
   *
   * DEFAULTS TO `{start: 0, count: 1}` FOR EVERY SHELF, which is what makes the
   * first client render identical to the server's: round 0 of fillAnimePages is
   * fillAnime by construction. Seeding this from Math.random, or restoring it
   * from storage, would be a hydration mismatch on a prerendered page.
   */
  const [shelf, setShelf] = useState<Record<string, { start: number; count: number }>>({})
  const shelfOf = (key: string) => shelf[key] ?? { start: 0, count: 1 }

  function loadMore(key: string, total: number) {
    setShelf((st) => {
      const cur = st[key] ?? { start: 0, count: 1 }
      return { ...st, [key]: { ...cur, count: Math.min(cur.count + 1, total) } }
    })
  }
  function shuffleShelf(key: string, total: number) {
    setShelf((st) => {
      const cur = st[key] ?? { start: 0, count: 1 }
      // Advance by however much is on screen, so a shuffle shows things you
      // have not seen rather than re-dealing the same page one along.
      return { ...st, [key]: { ...cur, start: (cur.start + cur.count) % total } }
    })
  }

  return (
    <>
      {state.adaMode && (
        <div className="mt-8 rounded-[18px] border-[3px] border-[#7fc4d4] bg-white/90 px-4 py-3">
          <p className="font-display text-[13px] font-extrabold uppercase tracking-[.2em] text-[#4f4550]">
            Ada Mode is on
          </p>
          <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-[#6f6473]">
            Every tile now carries ⛔ Exclude from Store, which hides it everywhere on the site
            and keeps it out of the Pinterest feeds, and ☆ to add it to your picks. Excluded
            items stay visible to you here, marked, so you can put one back.
          </p>
        </div>
      )}

      {/* PIN THE ROOM. The Pin worth making, for the reason lib/pinterest.ts
          states: a collection URL holds the whole shelf behind one click, where
          a Pin per product made in volume is the shape Pinterest's community
          guidelines limit. `social-pin.webp` because the art pack shipped a
          1000x1500 crop for exactly this, and that is Pinterest's native ratio:
          a wide image is letterboxed in the feed and a tall one is not. */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            logEvent('pin_click', { meta: 'anime-room' })
            pinCollection({
              path: '/anime',
              title: 'Kawaii Katz Goes Anime',
              tagline:
                'Five specialists rather than one shop that sells a bit of everything: bedding, jackets, kimono, backpacks and jigsaws',
              image: '/anime/social-pin.webp',
              tag: 'AnimeMerch',
              tags: ['AnimeAesthetic', 'AnimeRoomDecor', 'AnimeFashion', 'OtakuLife', 'KawaiiKatz'],
              tail: 'Anime rooms and wardrobes, curated on Kawaii Katz.',
            })
          }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#e60023] bg-[#e60023] px-5 py-2.5 font-display text-[14px] font-extrabold text-white transition-opacity hover:opacity-90"
          title="Pin the whole Anime room to one of your boards"
        >
          📌 Pin this room
        </button>
        {pool.length > 0 && (
          <span className="font-display text-[13px] font-bold text-[#efe2f6]">
            {pool.length.toLocaleString()} pieces across the five shelves
          </span>
        )}
      </div>

      {/* Section jump chips. Real anchors, so a Pin can deep-link to a shelf and
          the page is navigable without JavaScript. */}
      <nav className="mt-5 flex flex-wrap gap-2">
        {sections.map(({ section }) => (
          <a
            key={section.key}
            href={`#${section.key}`}
            className="inline-flex h-9 items-center rounded-full border-2 border-white/70 bg-white/80 px-3.5 font-display text-[12.5px] font-extrabold text-[#4f4550] transition-colors hover:bg-white"
            style={{ borderColor: section.accent }}
          >
            {section.title}
          </a>
        ))}
      </nav>

      {sections.map(({ section, pages }, i) => {
        const { start, count } = shelfOf(section.key)
        const products = Array.from({ length: Math.min(count, pages.length) }, (_, k) =>
          pages[(start + k) % pages.length]
        ).flat()
        const shelfTotal = pages.reduce((n, pg) => n + pg.length, 0)
        const voice = animeSectionPin(section.key)
        return (
          <div key={section.key}>
            {/* Between every shelf, not once under the hero. Skipped above the
                first, where the hero's own dissolve already does this job. */}
            {i > 0 && <div aria-hidden className={s.divider} />}

            <section
              id={section.key}
              className={`${s.shelf} ${i % 2 === 1 ? s.toned : ''} mt-9 scroll-mt-6`}
              style={{ ['--accent' as string]: section.accent }}
            >
              <div className={s.stickerWrap}>
                {/* The sticker is a background-image on a span rather than an
                    <img>: a section whose art has not been drawn gets no
                    sticker, where an <img> would put a torn-icon box in the
                    middle of a heading. */}
                <span
                  aria-hidden
                  className={s.sticker}
                  style={{ backgroundImage: `url(/anime/${section.sticker}.webp)` }}
                />
                <div className="min-w-0 pb-1">
                  <div className={`${s.kicker} font-display font-extrabold text-[11px] uppercase tracking-[1px]`}>
                    {section.kicker}
                  </div>
                  <h2 className="font-display font-extrabold text-[26px] sm:text-[34px] text-[#4f4550] leading-[1.06] mt-1">
                    <span className={s.title}>{section.title}</span>
                  </h2>
                </div>
              </div>

              <p className="text-[14.5px] text-[#6f6473] leading-relaxed max-w-[62ch] mt-3 mb-4">
                {section.blurb}
              </p>

              {/* PIN THE SHELF, NOT THE PRODUCT. The cover is the shelf's lead
                  PRODUCT rather than the room's artwork: Pinterest reads the
                  image to decide what a Pin is about, and somebody searching
                  anime bedding wants to see bedding. The mascot art leads the
                  room Pin above, where the subject really is the room. */}
              {products[0] && (
                <button
                  type="button"
                  onClick={() => {
                    logEvent('pin_click', { cat: section.key, meta: 'anime-shelf' })
                    pinCollection({
                      path: `/anime#${section.key}`,
                      title: section.title,
                      tagline: section.blurb,
                      image: products[0].image,
                      tag: voice.tag,
                      tags: voice.catTags,
                      tail: voice.tail,
                    })
                  }}
                  className="mb-5 inline-flex items-center gap-2 rounded-full border-[3px] border-[#e60023] bg-[#e60023] px-4 py-2 font-display text-[13px] font-extrabold text-white transition-opacity hover:opacity-90"
                  title={`Pin the whole "${section.title}" shelf to one of your boards`}
                >
                  📌 Pin this shelf
                </button>
              )}

              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    pin={pinFor(p)}
                    similarPool={pool}
                    isPicked={pickedIds.has(p.id)}
                    isExcluded={excludedIds.has(p.id)}
                    isAdaMode={state.adaMode}
                    onTogglePick={state.adaMode ? togglePick : undefined}
                    onToggleExclude={state.adaMode ? toggleExclude : undefined}
                  />
                ))}
              </div>

              {/* Neither button renders when there is nothing behind it: a
                  Shuffle that re-deals the same twelve tiles is a button that
                  lies. */}
              {pages.length > 1 && (
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => { logEvent('shuffle', { cat: section.key, meta: 'anime' }); shuffleShelf(section.key, pages.length) }}
                    className="inline-flex items-center gap-2 rounded-full border-[3px] bg-white px-4 py-2 font-display text-[13px] font-extrabold text-[#4f4550] transition-colors hover:text-white"
                    style={{ borderColor: section.accent, backgroundColor: 'white' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = section.accent }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
                  >
                    🔀 Shuffle
                  </button>
                  {count < pages.length && (
                    <button
                      type="button"
                      onClick={() => { logEvent('load_more', { cat: section.key, meta: 'anime' }); loadMore(section.key, pages.length) }}
                      className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#4f4550] bg-[#4f4550] px-4 py-2 font-display text-[13px] font-extrabold text-white transition-colors hover:bg-white hover:text-[#4f4550]"
                    >
                      ↓ Load more
                    </button>
                  )}
                  <span className="font-display text-[12.5px] font-bold text-[#6f6473]">
                    {products.length} of {shelfTotal}
                  </span>
                </div>
              )}
            </section>
          </div>
        )
      })}

      <AdaLoginModal open={adaLoginOpen} onClose={() => setAdaLoginOpen(false)} />
    </>
  )
}
