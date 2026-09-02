'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { usePicks } from '@/hooks/usePicks'
import { useStore } from '@/lib/store'
import {
  fillAnimePages,
  animePool,
  animeSectionIndex,
  animeSectionPin,
  houseOf,
  SHOPS,
} from '@/lib/anime'
import { pinCollection } from '@/lib/pinterest'
import { money, type Product } from '@/lib/data'
import { logEvent } from '@/lib/site-events'
import ProductCard from '@/components/ProductCard'
import AdaLoginModal, { ADA_SECRET_CODE } from '@/components/AdaLoginModal'
import AnimeDecor from '@/components/AnimeDecor'
import CartDrawer from '@/components/CartDrawer'
import FloatingCart from '@/components/FloatingCart'
import WishlistDrawer from '@/components/WishlistDrawer'

/**
 * Kawaii Katz Goes Anime.
 *
 * -----------------------------------------------------------------------------
 * THIRD ROOM, SAME BONES, DIFFERENT REGISTER
 *
 * Built on app/decora/DecoraClient.tsx deliberately: sections that fill in
 * order, a paged deal with Shuffle and Load more per shelf, Ada Mode on every
 * tile, a Pin per shelf and a Pin for the room. Every one of those has a note in
 * the Decora file explaining what it cost to get right, and re-deriving them
 * here would be re-paying for the same lessons.
 *
 * What is NOT shared is the look. /decora is decora: hot pink, checkerboard,
 * charms. This is a manga page at 2am: near-black, magenta and violet, halftone
 * screens and speed lines drifting behind everything, and a hero that is a night
 * street under sakura rather than a texture. Same cast, same motion vocabulary
 * (§4e-b), and the styling is what tells you which room you are in.
 *
 * -----------------------------------------------------------------------------
 * EVERY PIECE OF ARTWORK IS OURS AND NONE OF IT IS A CHARACTER SOMEBODY OWNS
 *
 * The art brief is explicit and it is the reason this room needed one: the shops
 * behind this page sell LICENSED merchandise, so their product photos are full
 * of characters other people own. Our own artwork contains none of them. The
 * cast is Katz, Panda and the bunny drawn in this room's register, and the only
 * licensed images anywhere on the page are the merchants' own product
 * photographs, served from their own CDNs and credited to their own shops.
 *
 * The brief's first rule holds too: NO WORDS ARE BAKED INTO ANY IMAGE. Every
 * heading, kicker and blurb here is HTML, so it can be translated, searched,
 * read aloud and edited without regenerating a picture.
 */

const IMG = '/anime/'

/** The cast, in small, for the hero chip row. */
const HERO_STICKERS = [
  { src: 'st-fit.webp', alt: 'Katz in an open bomber jacket, rim lit' },
  { src: 'st-carry.webp', alt: 'The bunny under a backpack far too large for her' },
  { src: 'st-new.webp', alt: 'Panda holding a parcel that has just arrived' },
  { src: 'st-build.webp', alt: 'Katz mid-panic over a half-finished puzzle' },
  { src: 'st-sleep.webp', alt: 'Panda asleep face-down in a duvet' },
  { src: 'st-layer.webp', alt: 'The bunny in a haori, arms folded, unimpressed' },
]

/**
 * Section backgrounds, cycled so no two in a row repeat.
 *
 * Unlike /decora these run as a full section wash rather than a narrow strip,
 * and that is the register difference doing real work: a leopard print behind a
 * product grid is unreadable, but a halftone screen at 10% is what a manga page
 * looks like underneath its panels. Speed lines get the lowest opacity because
 * they are directional and the eye follows them.
 */
const SECTION_SCREEN = [
  { src: 'pat-tone.webp', size: '150px auto', opacity: 0.1 },
  { src: 'pat-speed.webp', size: '300px auto', opacity: 0.07 },
  { src: 'pat-sakura.webp', size: '360px auto', opacity: 0.13 },
]

function Chip({ children, tone = 'pink' }: { children: React.ReactNode; tone?: 'pink' | 'violet' | 'cyan' }) {
  const tones: Record<string, string> = {
    pink: 'bg-[#ff2d92] text-white',
    violet: 'bg-[#8b3dff] text-white',
    cyan: 'bg-[#4de3ff] text-[#0a0614]',
  }
  return (
    <span
      className={`inline-block ${tones[tone]} border-[3px] border-white rounded-full px-3.5 py-1
        font-display font-extrabold text-[12px] tracking-wide uppercase
        shadow-[0_2px_0_rgba(0,0,0,.45)] rotate-[-1.5deg]`}
    >
      {children}
    </span>
  )
}

/** The charm string, tiled. Decorative, so aria-hidden. */
function Divider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-repeat-x bg-center ${className}`}
      style={{ backgroundImage: `url(${IMG}divider.webp)`, backgroundSize: 'auto 100%' }}
    />
  )
}

export default function AnimeClient({
  initialProducts,
  totalCount,
}: {
  initialProducts: Product[]
  /** The room's REAL size, counted server-side over the whole source set.
      `pool` below is only what this render has in hand, which during first
      paint is the section union, so counting it would understate the shop. */
  totalCount: number
}) {
  const { products: live, loading } = useLiveCatalog(initialProducts)
  const { excludedIds, exclude, restore } = useExclusions()
  const { pickedIds, togglePick } = usePicks()
  const { state } = useStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)
  const [adaLoginOpen, setAdaLoginOpen] = useState(false)

  /**
   * ADA MODE. Same hidden keydown buffer as the home page and /decora, and it
   * belongs on every room that shows product: a curator who can only hide things
   * from one page cannot actually hide them (§4). There is no search box here to
   * type the word into, which is why the listener is the only route.
   */
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

  /** In Ada Mode excluded rows STAY, marked. A curator who cannot see what she
      hid cannot restore it, and hiding is the one action here that most needs to
      be reversible. */
  const visible = useMemo(
    () => (state.adaMode ? live : live.filter((p) => !excludedIds.has(p.id))),
    [live, excludedIds, state.adaMode]
  )

  const { sections, roll } = useMemo(() => fillAnimePages(visible), [visible])
  const pool = useMemo(() => animePool(visible), [visible])

  /**
   * Which shelf each product is standing on, so a tile's Pin button speaks with
   * the same voice as the shelf's own Pin. Without it the two disagree on the
   * identical tile and the same board ends up holding both (§4f-b).
   */
  const shelfOfProduct = useMemo(() => animeSectionIndex(visible), [visible])
  const pinFor = (p: Product) => animeSectionPin(shelfOfProduct.get(p.id) ?? 'new')

  /**
   * How much of each shelf is on screen. `start` is which page it begins at and
   * `count` is how many pages stack from there, so Load more GROWS the shelf and
   * Shuffle SWAPS it for a slice the same size you have not seen. Both wrap.
   *
   * Defaults to `{start: 0, count: 1}` for every section, which is what makes
   * the first client render identical to the server's: round 0 of
   * fillAnimePages is fillAnime by construction. Seeding this from Math.random,
   * or restoring it from storage, would be a hydration mismatch.
   */
  const [shelf, setShelf] = useState<Record<string, { start: number; count: number }>>({})
  const shelfOf = (key: string) => shelf[key] ?? { start: 0, count: 1 }

  function loadMore(key: string, total: number) {
    setShelf((s) => {
      const cur = s[key] ?? { start: 0, count: 1 }
      return { ...s, [key]: { ...cur, count: Math.min(cur.count + 1, total) } }
    })
  }
  function shuffleShelf(key: string, total: number) {
    setShelf((s) => {
      const cur = s[key] ?? { start: 0, count: 1 }
      return { ...s, [key]: { ...cur, start: (cur.start + cur.count) % total } }
    })
  }

  const priceFrom = useMemo(() => {
    const ps = pool.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    return ps.length ? ps[0] : 0
  }, [pool])

  /** Houses actually on the shelf right now, for the hero's count. */
  const houses = useMemo(() => {
    const seen = new Set<string>()
    for (const p of pool) { const h = houseOf(p); if (h) seen.add(h) }
    return [...seen]
  }, [pool])

  return (
    <div className="relative min-h-screen bg-[#0a0614] text-white">
      <AnimeDecor />

      {/* ══════════════════════════════════════════════════ HERO */}
      <header className="relative z-10 overflow-hidden border-b-[5px] border-[#ff2d92]">
        {/* THE NIGHT STREET, AND IT IS ALLOWED TO BE A PICTURE.
            /decora runs its hero art at 0.22 as a texture, because that art is a
            busy Harajuku street that fights a headline. This one was drawn to
            the brief's instruction to "keep the centre visually quiet", so it
            can run at full strength with a scrim only where the type sits. */}
        <div aria-hidden className="absolute inset-0">
          <Image
            src={`${IMG}hero-bg.webp`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        {/* Halftone over the photograph, which is the print register: a manga
            page screens its backgrounds rather than printing them flat. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
          style={{ backgroundImage: `url(${IMG}pat-tone.webp)`, backgroundSize: '160px auto' }}
        />
        {/* The scrim, bottom-weighted, so the street stays visible at the top and
            the type at the bottom stays readable. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,6,20,.35) 0%, rgba(10,6,20,.55) 42%, rgba(10,6,20,.9) 100%)',
          }}
        />
        {/* Speed lines raking in from the left, sm and up only. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-[46%] hidden sm:block opacity-[0.18]"
          style={{
            backgroundImage: `url(${IMG}pat-speed.webp)`,
            backgroundSize: '280px auto',
            maskImage: 'linear-gradient(to right, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
          }}
        />

        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-6 pt-6 pb-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#4de3ff] hover:text-white transition-colors"
            >
              ← Back to Kawaii Katz
            </Link>
            <div className="flex gap-2">
              <Link
                href="/decora"
                className="border-[3px] border-white bg-transparent text-white rounded-full h-9 px-3.5 inline-flex items-center font-display font-extrabold text-[13px] hover:bg-white hover:text-[#0a0614] transition-colors"
              >
                Decora room →
              </Link>
              <button
                onClick={() => setWishOpen(true)}
                className="border-[3px] border-white bg-[#ff2d92] text-white rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-white hover:text-[#ff2d92] transition-colors"
              >
                ♥ My Board{state.wish.length ? ` (${state.wish.length})` : ''}
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="border-[3px] border-white bg-[#8b3dff] text-white rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-white hover:text-[#8b3dff] transition-colors"
              >
                🛒 Cart{state.cart.length ? ` (${state.cart.length})` : ''}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.02fr_1fr] gap-6 items-center mt-8">
            <div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Chip tone="cyan">Licensed by the shops</Chip>
                <Chip tone="pink">Sanrio · San-X · Ghibli</Chip>
              </div>

              {/* Display type, HTML, per the art brief's first rule. Nothing on
                  this page is lettered into a raster. */}
              <h1 className="font-display leading-[0.9] tracking-tight">
                <span className="block text-[13px] sm:text-[15px] font-extrabold uppercase tracking-[.3em] text-[#4de3ff] mb-2">
                  Kawaii Katz goes
                </span>
                <span
                  className="block text-[58px] sm:text-[88px] lg:text-[102px] font-extrabold text-white"
                  style={{ textShadow: '4px 4px 0 #ff2d92, 8px 8px 0 rgba(139,61,255,.6)' }}
                >
                  Anime
                </span>
              </h1>

              <p className="text-[16px] sm:text-[18px] font-bold text-[#ffd6ec] mt-5 max-w-[46ch] leading-relaxed">
                The characters, not the cosplay. Sanrio, San-X, Ghibli and the shows, pulled
                out of shops we like and laid out by what you would actually do with it: wear
                it, carry it, collect it, sleep under it.
              </p>

              {pool.length > 0 && (
                <p className="text-[13.5px] font-bold text-[#c9a8ff] mt-3">
                  {Math.max(totalCount, pool.length).toLocaleString()} pieces on the shelf right
                  now, from {money(priceFrom)}
                  {houses.length > 0 ? `, across ${houses.length} houses.` : '.'}
                </p>
              )}

              {/* THE ROOM PIN, and the one place the mascot art is the right
                  cover image. A shelf Pin shows the merchandise, because that is
                  what somebody searching anime merch wants to see. This Pin's
                  subject IS the room, so the cast is the honest picture of it,
                  and it is original art rather than a product photo a hundred
                  other affiliates are also pinning.

                  `social-pin.webp` rather than `trio.webp`: the art brief
                  delivered a 1000x1500 crop for exactly this, which is
                  Pinterest's native ratio. A wide image is letterboxed in the
                  feed and a tall one is not. */}
              <button
                type="button"
                onClick={() => {
                  logEvent('pin_click', { meta: 'anime-room' })
                  pinCollection({
                    path: '/anime',
                    title: 'Kawaii Katz Goes Anime',
                    tagline:
                      'Sanrio, San-X, Ghibli and the shows, sorted by what you would do with it: wear it, carry it, collect it, sleep under it',
                    image: `${IMG}social-pin.webp`,
                    tag: 'AnimeMerch',
                    tags: ['KawaiiAnime', 'AnimeAesthetic', 'Sanrio', 'OtakuLife', 'KawaiiKatz'],
                    tail: 'Character merch, curated on Kawaii Katz.',
                  })
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border-[3px] border-[#e60023] bg-[#e60023] px-5 py-2.5 font-display text-[14px] font-extrabold text-white transition-opacity hover:opacity-90"
                title="Pin the whole Anime room to one of your boards"
              >
                📌 Pin this room
              </button>

              {/* EACH POSE SITS ON A CHIP, and that is not decoration. Katz is a
                  black cat, so every pose of him is dark, and on a near-black
                  hero he disappears while the other two read fine. A pale chip
                  behind all six fixes it once instead of hunting for a light
                  Katz the character cannot have. */}
              <div className="flex gap-2.5 flex-wrap mt-5">
                {HERO_STICKERS.map((s) => (
                  <span
                    key={s.src}
                    className="inline-flex items-center justify-center h-[96px] w-[96px] rounded-2xl
                      bg-[#f3e9ff] border-[3px] border-white shrink-0
                      shadow-[0_6px_16px_rgba(0,0,0,.6)] rotate-[-3deg] even:rotate-[3deg]"
                  >
                    <Image
                      src={`${IMG}${s.src}`}
                      alt={s.alt}
                      width={600}
                      height={600}
                      className="h-[82px] w-auto max-w-[86px] object-contain"
                    />
                  </span>
                ))}
              </div>
            </div>

            {/* THE CAST, AS ONE COMPOSED GROUP. Drawn together rather than three
                cutouts butted up, which reads as pasted because it is. */}
            <div className="relative flex items-center justify-center min-h-[260px] sm:min-h-[360px]">
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{ background: 'radial-gradient(58% 58% at 50% 52%, rgba(255,45,146,.42), transparent 72%)' }}
              />
              <Image
                src={`${IMG}trio.webp`}
                alt="Katz, the bunny and Panda, drawn as anime"
                width={1100}
                height={630}
                priority
                sizes="(max-width: 640px) 92vw, 600px"
                className="relative w-full max-w-[600px] h-auto drop-shadow-[0_16px_38px_rgba(0,0,0,.75)]"
              />
            </div>
          </div>

          {/* Affiliate disclosure, above the fold and beside the first thing that
              could be mistaken for a shop. */}
          <p className="text-[12.5px] font-semibold text-[#c3aee6] mt-8 max-w-[74ch] leading-relaxed">
            We do not sell any of this. Every piece is stocked by an independent shop
            ({SHOPS.map((s) => s.vendor).join(', ')}), and links out are affiliate links, so we
            may earn a commission when you buy. You check out on their site, never ours. The
            characters and series named on this page are their owners&apos; trademarks, not
            ours, and the cast in the artwork is Kawaii Katz&apos;s own.
          </p>
        </div>
      </header>

      <Divider className="h-[34px] sm:h-[46px] border-b-2 border-[#2c1a4d]" />

      {/* ══════════════════════════════════════════════════ SECTIONS */}
      <main className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-6 py-9">
        {loading && !pool.length ? (
          <p className="text-[#c9a8ff] font-bold py-12 text-center">Opening the box...</p>
        ) : !pool.length ? (
          <p className="text-[#c9a8ff] font-bold py-12 text-center">
            Nothing on the shelf right now. The catalogue refreshes every few hours.
          </p>
        ) : (
          <>
            {state.adaMode && (
              <div className="mb-6 rounded-[18px] border-[3px] border-[#4de3ff] bg-[#082a33] px-4 py-3">
                <p className="font-display text-[13px] font-extrabold uppercase tracking-[.2em] text-[#4de3ff]">
                  Ada Mode is on
                </p>
                <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-[#bdf3f6]">
                  Every tile now carries ⛔ Exclude from Store, which hides it everywhere on the
                  site and keeps it out of the Pinterest feeds, and ☆ to add it to your picks.
                  Excluded items stay visible to you here, marked, so you can put one back.
                </p>
              </div>
            )}

            {/* Section jump chips. Real anchors, so a Pin can deep-link to a
                shelf and the page is navigable without JavaScript. */}
            <nav className="flex gap-2 flex-wrap mb-8">
              {sections.map(({ section }) => (
                <a
                  key={section.key}
                  href={`#${section.key}`}
                  className="border-2 border-[#8b3dff] bg-[#170c2b] text-[#e9d9ff] rounded-full px-3.5 h-9 inline-flex items-center font-display font-extrabold text-[12.5px] hover:bg-[#8b3dff] hover:text-white transition-colors"
                >
                  {section.title}
                </a>
              ))}
            </nav>

            {sections.map(({ section, pages }, si) => {
              const { start, count } = shelfOf(section.key)
              const products = Array.from({ length: Math.min(count, pages.length) }, (_, k) =>
                pages[(start + k) % pages.length]
              ).flat()
              const shelfTotal = pages.reduce((n, pg) => n + pg.length, 0)
              const screen = SECTION_SCREEN[si % SECTION_SCREEN.length]
              const voice = animeSectionPin(section.key)
              return (
                <section key={section.key} id={section.key} className="relative mb-14 scroll-mt-6">
                  {/* THE SCREEN, per section. A full wash rather than /decora's
                      narrow strip: a halftone at 10% is what a manga page looks
                      like under its panels, and nothing here has to be read
                      through it. Cycled so no two consecutive sections repeat. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-5 -inset-y-4 -z-10 rounded-[28px] bg-repeat"
                    style={{
                      backgroundImage: `url(${IMG}${screen.src})`,
                      backgroundSize: screen.size,
                      opacity: screen.opacity,
                    }}
                  />

                  {/* The charm string between sections, never before the first. */}
                  {si > 0 && <Divider className="h-[26px] sm:h-[34px] mb-9 opacity-90" />}

                  <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.24em] text-[#4de3ff]">
                    {section.kicker}
                  </span>
                  <div className="flex items-center gap-3 sm:gap-5 mt-1">
                    <h2
                      className="font-display font-extrabold text-[34px] sm:text-[46px] leading-[0.98] text-white"
                      style={{ textShadow: '3px 3px 0 #ff2d92' }}
                    >
                      {section.title}
                    </h2>
                    {/* EVERY SECTION GETS A POSE. Not most, every one. Six
                        shelves, six poses, each chosen for the shelf it sits on
                        rather than shuffled: Panda asleep on the bedding shelf,
                        the bunny buried under a backpack on the bag shelf. A
                        random pose would read as wallpaper. */}
                    <Image
                      src={`${IMG}${section.sticker.src}`}
                      alt={section.sticker.alt}
                      width={600}
                      height={600}
                      className="h-[84px] sm:h-[122px] w-auto shrink-0 -mt-3 drop-shadow-[0_8px_18px_rgba(0,0,0,.65)]"
                    />
                  </div>
                  <p className="text-[14.5px] font-semibold text-[#c3aee6] mt-2 mb-3 max-w-[62ch] leading-relaxed">
                    {section.blurb}
                  </p>

                  {/* PIN THE SHELF, NOT THE PRODUCT. A shelf URL holds dozens of
                      products behind one click and keeps working, where a Pin
                      per product made in volume is the shape Pinterest's
                      community guidelines limit (§4e). The cover is the shelf's
                      lead PRODUCT rather than the room's artwork: Pinterest
                      reads the image to decide what a Pin is about, and somebody
                      searching anime merch wants the merch. */}
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

                  {/* Shuffle SWAPS the shelf for a slice the same size you have
                      not seen; Load more GROWS it and keeps what you were
                      looking at. Neither renders when there is nothing behind
                      it: a Shuffle that re-deals the same tiles is a button that
                      lies. */}
                  {pages.length > 1 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => { logEvent('shuffle', { cat: section.key, meta: 'anime' }); shuffleShelf(section.key, pages.length) }}
                        className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#4de3ff] bg-transparent px-4 py-2 font-display text-[13px] font-extrabold text-[#4de3ff] transition-colors hover:bg-[#4de3ff] hover:text-[#0a0614]"
                      >
                        🔀 Shuffle
                      </button>
                      {count < pages.length && (
                        <button
                          type="button"
                          onClick={() => { logEvent('load_more', { cat: section.key, meta: 'anime' }); loadMore(section.key, pages.length) }}
                          className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#8b3dff] bg-[#8b3dff] px-4 py-2 font-display text-[13px] font-extrabold text-white transition-colors hover:bg-white hover:text-[#8b3dff]"
                        >
                          ↓ Load more
                        </button>
                      )}
                      <span className="font-display text-[12.5px] font-bold text-[#9d86c4]">
                        {products.length} of {shelfTotal}
                      </span>
                    </div>
                  )}
                </section>
              )
            })}

            {/* ═════════════════════════════ THE ROLL CALL */}
            {roll.length > 0 && (
              <section id="roll" className="mb-12 scroll-mt-6">
                <div className="relative overflow-hidden rounded-[26px] border-[4px] border-[#ff2d92] bg-[#150a28] p-5 sm:p-7">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.1] bg-repeat"
                    style={{ backgroundImage: `url(${IMG}pat-speed.webp)`, backgroundSize: '260px auto' }}
                  />
                  {/* The trio again, cornered and low. The hero shows them as the
                      subject; here they are a watermark on the page's editorial
                      voice. */}
                  <Image
                    src={`${IMG}trio.webp`}
                    alt=""
                    aria-hidden
                    width={1100}
                    height={630}
                    className="pointer-events-none absolute -right-10 -top-8 w-[280px] h-auto opacity-25 hidden sm:block"
                  />
                  <div className="relative flex items-center gap-4 flex-wrap mb-3">
                    <Image
                      src={`${IMG}st-layer.webp`}
                      alt=""
                      width={600}
                      height={600}
                      className="h-[104px] w-auto drop-shadow-[0_8px_18px_rgba(0,0,0,.6)]"
                    />
                    <div>
                      <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.24em] text-[#4de3ff]">
                        One piece per house
                      </span>
                      <h2
                        className="font-display font-extrabold text-[34px] sm:text-[44px] leading-[0.98] text-white"
                        style={{ textShadow: '3px 3px 0 #8b3dff' }}
                      >
                        The Roll Call
                      </h2>
                    </div>
                  </div>
                  <p className="relative text-[14.5px] font-semibold text-[#c3aee6] mb-5 max-w-[64ch] leading-relaxed">
                    A tour rather than a top ten. We cannot see what sells on their sites, only
                    what gets clicked on ours, so this is one thing from each house the shops
                    actually carry.
                  </p>
                  <div className="relative grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                    {roll.map((p) => (
                      <ProductCard
                        key={`roll-${p.id}`}
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
                </div>
              </section>
            )}
          </>
        )}

        {/* THE WALK HOME. A full-bleed band, the one place the hero art gets to
            be a picture again rather than a backdrop: it closes the shelf and
            hands over to the plain attribution block below, which is the one
            part of the page that must not look decorated. */}
        <section aria-hidden className="relative -mx-4 sm:-mx-6 mt-6 mb-6 overflow-hidden">
          <div className="relative h-[170px] sm:h-[260px]">
            <Image
              src={`${IMG}hero-bg.webp`}
              alt=""
              fill
              sizes="100vw"
              className="scale-105 object-cover object-bottom"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, #0a0614 0%, rgba(10,6,20,0) 30%, rgba(10,6,20,0) 64%, #0a0614 100%)',
              }}
            />
          </div>
        </section>

        {/* WHERE IT COMES FROM. Each shop's own words about itself, never ours
            about them, and nothing time-sensitive: a page cached for six hours
            cannot keep a promise about stock or delivery. */}
        <section className="relative overflow-hidden rounded-[22px] border-2 border-[#8b3dff] bg-[#150a28] p-5 sm:p-6 mt-4">
          <Image
            src={`${IMG}st-new.webp`}
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="pointer-events-none absolute -right-6 -top-6 w-[150px] h-auto opacity-25 rotate-[8deg] hidden sm:block"
          />
          <h2 className="relative font-display font-extrabold text-[19px] text-white mb-1">
            Where it comes from
          </h2>
          <p className="relative text-[13px] font-semibold text-[#9a86c4] leading-relaxed max-w-[72ch] mb-4">
            Kawaii Katz is the editorial. These are the shops that actually stock and ship it.
          </p>

          {SHOPS.map((shop) => (
            <div key={shop.vendor} className="relative border-t border-[#2c1a4d] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
              <h3 className="font-display font-extrabold text-[16px] text-white">{shop.vendor}</h3>
              <p className="text-[14px] font-semibold text-[#c3aee6] leading-relaxed max-w-[72ch] mt-1">
                Describes itself as carrying {shop.says}. Those are its words about its own shop,
                not a promise from us.
              </p>
              <a
                href={shop.home}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={() => logEvent('outbound_click', { vendor: shop.vendor, meta: 'anime-shop-note' })}
                className="inline-block mt-3 bg-[#ff2d92] text-white border-[3px] border-white rounded-full px-5 h-10 leading-[34px] font-display font-extrabold text-[13.5px] hover:bg-white hover:text-[#ff2d92] transition-colors"
              >
                Visit {shop.vendor} →
              </a>
            </div>
          ))}

          <p className="relative text-[13px] font-semibold text-[#9a86c4] leading-relaxed max-w-[72ch] mt-5 pt-4 border-t border-[#2c1a4d]">
            Prices and availability come from each shop&apos;s live catalogue and change without
            us knowing. We are not affiliated with, endorsed by, or speaking for any of them or
            for any character licence named here. Every series and character is its owner&apos;s
            trademark; the cast in our artwork is Kawaii Katz&apos;s own and appears nowhere
            else. Links out are affiliate links.
          </p>
        </section>
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={live} />
      <FloatingCart products={live} onOpen={() => setCartOpen(true)} tone="decora" />
      <AdaLoginModal open={adaLoginOpen} onClose={() => setAdaLoginOpen(false)} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={live} />
    </div>
  )
}
