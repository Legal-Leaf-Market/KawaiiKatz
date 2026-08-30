'use client'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { useStore } from '@/lib/store'
import {
  fillDecora,
  decoraPool,
  decoraBoardIndex,
  decoraPin,
  decoraSectionPin,
  SHOPS,
} from '@/lib/decora'
import { pinCollection } from '@/lib/pinterest'
import { money, type Product } from '@/lib/data'
import { logEvent } from '@/lib/site-events'
import ProductCard from '@/components/ProductCard'
import CartDrawer from '@/components/CartDrawer'
import FloatingCart from '@/components/FloatingCart'
import WishlistDrawer from '@/components/WishlistDrawer'

/**
 * The Decora room.
 *
 * -----------------------------------------------------------------------------
 * THIS IS THE ONE PAGE THAT DOES NOT MATCH THE SITE, ON PURPOSE
 *
 * Section 7 of PROJECT_GUIDE says do not restyle to match the sister sites,
 * because Kawaii Katz is deliberately its own aesthetic. That rule is about not
 * flattening this site into the others; it is not a rule that every page here
 * must be cream and blush. The handoff brief is explicit: "Avoid making the
 * entire site baby-pastel. This section is the more fashion-forward room of
 * KawaiiKatz." So this page runs hot pink, violet, black and cyan, and the rest
 * of the site is untouched.
 *
 * The audience is the difference. The home page sells to somebody buying a
 * plushie; this sells to somebody building an outfit, and the copy register
 * follows: short, confident, never infantilising.
 *
 * -----------------------------------------------------------------------------
 * WHAT THE ART IS AND IS NOT
 *
 * Katz and Panda are the site's own characters and already ship as the brand
 * marks (public/brand-cat.png, assets/logo-*.webp). The bunny is Kawaii Katz's
 * own editorial character, lifted from the concept sheet in the handoff pack.
 *
 * IT IS NOT ANY SHOP'S MASCOT OR LOGO AND MUST NEVER BE PRESENTED AS ONE.
 * The brief's legal guardrail is explicit about this, and it is why the room is
 * named after the aesthetic rather than after a retailer: our rabbit stands
 * next to the words "Kawaii Katz goes Decora", never next to a shop's name as
 * though they drew it. Shop attribution is a separate, plain, text-only block
 * near the foot, and every label named there is called out as their trademark.
 *
 * All typography is HTML and CSS. None of the lettering baked into the concept
 * art is used, per the brief, and no category name is baked into a raster.
 */

const IMG = '/decora/'

/**
 * The cast, in small. All transparent, all cut from the asset sheet.
 *
 * `alt` is what the sticker SHOWS rather than a filename, because a screen
 * reader on this row should get the joke the row is making: Katz is chaos,
 * Panda is unbothered, Bunny is unimpressed.
 */
const HERO_STICKERS = [
  { src: 'st-katz.webp', alt: 'Katz, fluffed up and sparkling' },
  { src: 'st-bunny.webp', alt: 'The bunny, deadpan, throwing a peace sign' },
  { src: 'st-panda.webp', alt: 'Panda in headphones, entirely unbothered' },
  { src: 'st-box.webp', alt: 'Katz and Panda in a parcel that just arrived' },
  { src: 'st-donut.webp', alt: 'Panda eating a donut in one go' },
  { src: 'st-katzflower.webp', alt: 'Katz buried in flowers' },
]

/**
 * EVERY SECTION GETS A POSE. Not most, every one.
 *
 * The pairing is meant rather than shuffled: the bunny drowning in shopping
 * bags goes on Bags and chaos, the one hugging a plush on Room loot, Panda in
 * headphones on the tech-adjacent shelf. A random pose per section would read
 * as wallpaper; a chosen one reads as a joke about that shelf.
 */
const SECTION_STICKER: Record<string, { src: string; alt: string }> = {
  new: { src: 'st-box.webp', alt: 'Katz and Panda in a parcel that just arrived' },
  fit: { src: 'st-p2.webp', alt: 'The bunny, mid outfit check' },
  more: { src: 'st-p4.webp', alt: 'The bunny wearing every clip she owns' },
  bags: { src: 'st-bags.webp', alt: 'The bunny carrying more bags than she can hold' },
  desk: { src: 'st-p7.webp', alt: 'Katz sitting on the stationery' },
  room: { src: 'st-room.webp', alt: 'The bunny in a hoodie, hugging a plush' },
  anime: { src: 'st-panda.webp', alt: 'Panda in headphones, entirely unbothered' },
}

/**
 * Patterns, used as narrow banding rather than as full backgrounds.
 *
 * A leopard print behind a product grid is unreadable and a plaid behind body
 * copy is worse. They run as thin strips under the section headings, where the
 * texture registers and nothing has to be read through it. Cycled by index so
 * consecutive sections never repeat.
 */
const PATTERNS = ['pat-plaid.webp', 'pat-stripe.webp', 'pat-check.webp', 'pat-leopard.webp']

/**
 * Charm clusters, scattered behind the hero content.
 *
 * `pointer-events-none` and `aria-hidden` on every one: they are confetti. A
 * screen reader listing four charm clusters before the headline, or a stray
 * click landing on a bow instead of the link under it, would both be the
 * decoration taking something from the page rather than giving to it.
 */
const HERO_CONFETTI = [
  { src: 'charms-a.webp', cls: 'top-[-5%] left-[-3%] w-[160px] rotate-[-14deg] opacity-70' },
  { src: 'charms-c.webp', cls: 'top-[-6%] right-[6%] w-[210px] rotate-[10deg] opacity-60' },
  { src: 'charms-d.webp', cls: 'bottom-[-4%] right-[-3%] w-[200px] rotate-[-8deg] opacity-70' },
  { src: 'charms-b.webp', cls: 'bottom-[-6%] left-[-4%] w-[210px] rotate-[6deg] opacity-55' },
]

function Sticker({ children, tone = 'pink' }: { children: React.ReactNode; tone?: 'pink' | 'violet' | 'cyan' | 'black' }) {
  const tones: Record<string, string> = {
    pink: 'bg-[#ff2d92] text-white',
    violet: 'bg-[#8b3dff] text-white',
    cyan: 'bg-[#25e0e8] text-[#1a0b2e]',
    black: 'bg-[#160a24] text-white',
  }
  return (
    <span
      className={`inline-block ${tones[tone]} border-[3px] border-white rounded-full px-3.5 py-1
        font-display font-extrabold text-[12px] tracking-wide uppercase
        shadow-[0_2px_0_rgba(0,0,0,.35)] rotate-[-1.5deg]`}
    >
      {children}
    </span>
  )
}

export default function DecoraClient({
  initialProducts,
  totalCount,
}: {
  initialProducts: Product[]
  /** The shelf's REAL size, counted server-side over the whole catalogue.
      `pool` below is only what this render has in hand, which during first
      paint is the section union, so counting it would understate the shop. */
  totalCount: number
}) {
  const { products: live, loading } = useLiveCatalog(initialProducts)
  const { excludedIds } = useExclusions()
  const { state } = useStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)

  /**
   * `useLiveCatalog` holds SHOWCASE vendors out of `products`, which is right
   * for the home grid and wrong here only if a source is ever given a showcase.
   * Grumpy Bunny has none, so `products` is the correct list and using it keeps
   * this page consistent with the rest of the site's idea of the catalogue.
   */
  const visible = useMemo(
    () => live.filter((p) => !excludedIds.has(p.id)),
    [live, excludedIds]
  )

  const { sections, edit } = useMemo(() => fillDecora(visible), [visible])
  const pool = useMemo(() => decoraPool(visible), [visible])

  /**
   * The Decora board each product belongs to, so the Pin button on a tile
   * carries the same voice as the feed that publishes it.
   *
   * Without this the two halves disagree: Pinterest builds a Pin from
   * /feeds/decora-tops.xml reading "a Harajuku top pick" and tagged #DecoraKei,
   * and the button on the identical tile produces "a kawaii apparel pick"
   * tagged #KidsFashion, because those come from the product's own category.
   * The same board would then hold both, which is the topic mismatch section 4f
   * is about.
   */
  const boardOf = useMemo(() => decoraBoardIndex(visible), [visible])
  const pinFor = (p: Product) => {
    const b = boardOf.get(p.id)
    return b ? decoraPin(b) : undefined
  }

  const priceFrom = useMemo(() => {
    const ps = pool.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    return ps.length ? ps[0] : 0
  }, [pool])

  return (
    <div className="min-h-screen bg-[#12071f] text-white">
      {/* ══════════════════════════════════════════════════ HERO */}
      <header className="relative overflow-hidden border-b-[5px] border-[#ff2d92]">
        {/* Checkerboard + glow, both pure CSS. The brief lists gingham and
            checkerboard as motifs; baking them into a raster would cost a
            megabyte and would not scale to a phone. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#ff2d92 25%,transparent 25%,transparent 75%,#ff2d92 75%),' +
              'linear-gradient(45deg,#ff2d92 25%,transparent 25%,transparent 75%,#ff2d92 75%)',
            backgroundSize: '56px 56px',
            backgroundPosition: '0 0, 28px 28px',
          }}
        />
        {/* The Harajuku street, low and blurred. It is a TEXTURE, not a
            picture: at full strength it fights the headline, which is the
            thing the hero is actually for. Behind the checkerboard and the
            glow so the three layers read as one surface. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.22] bg-cover bg-center"
          style={{ backgroundImage: `url(${IMG}hero-bg.webp)`, filter: 'blur(1.5px) saturate(1.15)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(139,61,255,.6), rgba(18,7,31,.82) 68%)' }}
        />

        {/* CONFETTI SITS ABOVE THE GRADIENT, NOT UNDER IT.
            The first pass had the art beneath the wash, which is what made
            everything look muted and half-there: a 82% dark radial over the
            top of a drawing is a drawing you have dimmed on purpose. The
            gradient's job is to make the HEADLINE readable, so it goes under
            anything drawn and over nothing else. Hidden below `sm` because on
            a phone there is no margin to scatter into. */}
        {/* CONFETTI HUGS THE FRAME AND NEVER THE COPY.
            The first placement scattered these across the whole hero, which
            put a bow on top of the back-link and a row of hearts through the
            affiliate disclosure. Decoration that sits on the one paragraph
            with a legal job is decoration that has taken something from the
            page. They now clip to the outer edges only. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block overflow-hidden">
          {HERO_CONFETTI.map((c) => (
            <img
              key={c.src}
              src={`${IMG}${c.src}`}
              alt=""
              aria-hidden
              className={`absolute h-auto drop-shadow-[0_4px_12px_rgba(0,0,0,.45)] ${c.cls}`}
            />
          ))}
        </div>

        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-6 pt-6 pb-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#25e0e8] hover:text-white transition-colors"
            >
              ← Back to Kawaii Katz
            </Link>
            <div className="flex gap-2">
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

          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6 items-center mt-6">
            <div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Sticker tone="cyan">Direct from Japan</Sticker>
                <Sticker tone="pink">Decora · Harajuku</Sticker>
              </div>

              {/* Display type, built here rather than lifted from the concept
                  art. The brief: "Rebuild all typography as HTML/CSS/SVG." */}
              {/* THE ROOM IS NAMED AFTER THE AESTHETIC, NOT THE SHOP. See the
                  note on SOURCES in lib/decora.ts: a shop's name in 88px type
                  reads as their page even when every word on it is ours. */}
              <h1 className="font-display leading-[0.92] tracking-tight">
                <span className="block text-[13px] sm:text-[15px] font-extrabold uppercase tracking-[.28em] text-[#25e0e8] mb-2">
                  Kawaii Katz goes
                </span>
                <span
                  className="block text-[62px] sm:text-[92px] lg:text-[104px] font-extrabold text-white"
                  style={{ textShadow: '4px 4px 0 #ff2d92, 8px 8px 0 rgba(139,61,255,.55)' }}
                >
                  Decora
                </span>
              </h1>

              <p className="text-[16px] sm:text-[18px] font-bold text-[#ffd6ec] mt-5 max-w-[46ch] leading-relaxed">
                Cute. Chaotic. Completely intentional. Japanese street fashion, decora
                accessories and character collabs, pulled out of shops we like and laid out
                the way we would wear it.
              </p>

              {pool.length > 0 && (
                <p className="text-[13.5px] font-bold text-[#b79cff] mt-3">
                  {Math.max(totalCount, pool.length).toLocaleString()} pieces on the shelf right
                  now, from {money(priceFrom)}.
                </p>
              )}

              {/*
                THE ROOM PIN, and the one place the mascot art is the right
                cover image.

                A shelf Pin shows the clothes, because that is what somebody
                searching Harajuku fashion wants to see. This Pin's subject IS
                the room, so the cast is the honest picture of it, and it is
                original art rather than a photograph a hundred other affiliates
                are also pinning.
              */}
              <button
                type="button"
                onClick={() => {
                  logEvent('pin_click', { meta: 'decora-room' })
                  pinCollection({
                    path: '/decora',
                    title: 'Kawaii Katz Goes Decora',
                    tagline:
                      'Harajuku and J-fashion picked one shelf at a time: tops, skirts, bags, clips and Sanrio',
                    image: `${IMG}trio.webp`,
                    tag: 'DecoraKei',
                    tags: ['HarajukuFashion', 'JapaneseStreetFashion', 'JFashion', 'DecoraFashion', 'KawaiiKatz'],
                    tail: 'Japanese street style, curated on Kawaii Katz.',
                  })
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border-[3px] border-[#e60023] bg-[#e60023] px-5 py-2.5 font-display text-[14px] font-extrabold text-white transition-opacity hover:opacity-90"
                title="Pin the whole Decora room to one of your boards"
              >
                📌 Pin this room
              </button>

              <div className="flex gap-2.5 flex-wrap mt-5">
                {/* EACH POSE SITS ON A CHIP, and that is not decoration.
                    Katz is a black cat, so every pose of him is dark, and on a
                    near-black hero he disappears while the bunny and Panda read
                    fine. A pale chip behind all four fixes it once instead of
                    hunting for a light Katz that the character cannot have, and
                    the white sticker border is a listed motif anyway. */}
                {HERO_STICKERS.map((s) => (
                  <span
                    key={s.src}
                    className="inline-flex items-center justify-center h-[68px] w-[68px] rounded-2xl
                      bg-[#f6ecff] border-[3px] border-white shrink-0
                      shadow-[0_4px_10px_rgba(0,0,0,.45)] rotate-[-3deg] even:rotate-[3deg]"
                  >
                    <Image
                      src={`${IMG}${s.src}`}
                      alt={s.alt}
                      width={400}
                      height={300}
                      className="h-[56px] w-auto max-w-[60px] object-contain"
                    />
                  </span>
                ))}
              </div>
            </div>

            {/* THE CAST, AS ONE COMPOSED GROUP.
                This was three separate cutouts butted together, which read as
                pasted because it was: the bunny needed a white sticker frame to
                hide a background-carrying crop, and Katz and Panda were sliced
                by the container edge. The asset sheet has them drawn together,
                so the composition is the artist's rather than CSS's. */}
            <div className="relative flex items-center justify-center min-h-[240px] sm:min-h-[340px]">
              {/* A halo behind the cast rather than a wash over it, so the art
                  sits on the top layer and stays at full strength. */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{ background: 'radial-gradient(58% 58% at 50% 52%, rgba(255,45,146,.34), transparent 72%)' }}
              />
              <Image
                src={`${IMG}trio.webp`}
                alt="Katz, the bunny and Panda, out together in full decora"
                width={1200}
                height={926}
                priority
                sizes="(max-width: 640px) 92vw, 620px"
                className="relative w-full max-w-[620px] h-auto drop-shadow-[0_14px_34px_rgba(0,0,0,.65)]"
              />
            </div>
          </div>

          {/* Affiliate disclosure, ABOVE the fold and next to the first thing
              that could be mistaken for a shop. The brief asks for it to be
              clear near outbound links; putting it only in the footer would
              technically satisfy that and practically not. */}
          <p className="text-[12.5px] font-semibold text-[#c9b4e8] mt-8 max-w-[70ch] leading-relaxed">
            We do not sell any of this. Every piece is stocked by an independent shop
            ({SHOPS.map((s) => s.vendor).join(', ')}), and links out are affiliate links, so we
            may earn a commission when you buy. You check out on their site, never ours.
          </p>
        </div>
      </header>

      {/* A charm string across the full width, straight under the hero. The
          divider art tiles, so this costs one image and no layout. */}
      <div
        aria-hidden
        className="h-[34px] sm:h-[46px] bg-repeat-x bg-center border-b-2 border-[#3a2359]"
        style={{ backgroundImage: `url(${IMG}divider.webp)`, backgroundSize: 'auto 100%' }}
      />

      {/* ══════════════════════════════════════════════════ SECTIONS */}
      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-9">
        {loading && !pool.length ? (
          <p className="text-[#b79cff] font-bold py-12 text-center">Opening the wardrobe...</p>
        ) : !pool.length ? (
          <p className="text-[#b79cff] font-bold py-12 text-center">
            Nothing on the shelf right now. The catalogue refreshes every few hours.
          </p>
        ) : (
          <>
            {/* The picnic, framed, beside the jump chips. It is the softest
                image in the set, which is why it sits here rather than in a
                product section: it introduces the cast before the shelf
                starts, and then the page gets loud. */}
            <div className="flex items-center gap-5 mb-7 flex-wrap">
              <div className="relative shrink-0 hidden sm:block">
                <Image
                  src={`${IMG}scene-picnic.webp`}
                  alt="Katz, the bunny and Panda on a picnic blanket"
                  width={800}
                  height={470}
                  className="w-[260px] h-auto rounded-[18px] border-[4px] border-white shadow-[0_10px_26px_rgba(0,0,0,.6)] rotate-[-2deg]"
                />
                <Image
                  src={`${IMG}charms-a.webp`}
                  alt=""
                  aria-hidden
                  width={420}
                  height={220}
                  className="pointer-events-none absolute -right-7 -bottom-5 w-[120px] h-auto rotate-[12deg]"
                />
              </div>
              <p className="text-[15px] font-bold text-[#ffd6ec] max-w-[38ch] leading-relaxed">
                Eight shelves, one shop, and a cast that has opinions about all of it.
                Start anywhere.
              </p>
            </div>

            {/* Section jump chips. Real anchors, so the page is navigable
                without JavaScript and a Pin can deep-link to a section. */}
            <nav className="flex gap-2 flex-wrap mb-9">
              {sections.map(({ section }) => (
                <a
                  key={section.key}
                  href={`#${section.key}`}
                  className="border-2 border-[#8b3dff] bg-[#1d0d33] text-[#e9d9ff] rounded-full px-3.5 h-9 inline-flex items-center font-display font-extrabold text-[12.5px] hover:bg-[#8b3dff] hover:text-white transition-colors"
                >
                  {section.title}
                </a>
              ))}
            </nav>

            {sections.map(({ section, products }, si) => (
              <section
                key={section.key}
                id={section.key}
                className="relative mb-12 scroll-mt-6"
              >
                {/* Room loot, and only Room loot, gets the bedroom behind it.
                    A scene per section would be noise; one section whose whole
                    subject is a bedroom shelf gets to show the bedroom. */}
                {section.key === 'room' && (
                  <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-4 bottom-0 -z-10 overflow-hidden rounded-[26px]">
                    <Image src={`${IMG}scene-bedroom.webp`} alt="" fill sizes="100vw" className="object-cover opacity-[0.16]" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(18,7,31,.4), #12071f 78%)' }} />
                  </div>
                )}
                {/* The charm string, between sections and never before the
                    first. Decorative only, so it is aria-hidden: a screen
                    reader announcing "bows and safety pins" eight times is
                    noise, and the heading below already says where you are. */}
                {si > 0 && (
                  <div
                    aria-hidden
                    className="h-[26px] sm:h-[34px] mb-9 bg-repeat-x bg-center opacity-90"
                    style={{ backgroundImage: `url(${IMG}divider.webp)`, backgroundSize: 'auto 100%' }}
                  />
                )}
                <div className="flex items-end gap-3 flex-wrap mb-1">
                  <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.24em] text-[#25e0e8]">
                    {section.kicker}
                  </span>
                </div>
                <div className="flex items-center gap-3 sm:gap-5">
                  <h2
                    className="font-display font-extrabold text-[34px] sm:text-[46px] leading-[0.98] text-white"
                    style={{ textShadow: '3px 3px 0 #ff2d92' }}
                  >
                    {section.title}
                  </h2>
                  {SECTION_STICKER[section.key] && (
                    <Image
                      src={`${IMG}${SECTION_STICKER[section.key].src}`}
                      alt={SECTION_STICKER[section.key].alt}
                      width={430}
                      height={320}
                      className="h-[70px] sm:h-[104px] w-auto shrink-0 -mt-2 drop-shadow-[0_6px_14px_rgba(0,0,0,.55)]"
                    />
                  )}
                </div>
                {/* A strip of the pattern, cycled so no two sections repeat.
                    Narrow on purpose: these are loud prints and nothing has to
                    be read through a strip. */}
                <div
                  aria-hidden
                  className="h-[16px] rounded-full mt-3 mb-1 opacity-95 bg-repeat-x"
                  style={{
                    backgroundImage: `url(${IMG}${PATTERNS[si % PATTERNS.length]})`,
                    backgroundSize: 'auto 100%',
                  }}
                />
                <p className="text-[14.5px] font-semibold text-[#c9b4e8] mt-2 mb-3 max-w-[62ch] leading-relaxed">
                  {section.blurb}
                </p>
                {/*
                  PIN THE SHELF, NOT THE PRODUCT.

                  The Decora boards are fed by RSS, and Pinterest takes 24 to 48
                  hours to publish the first item from a new feed, which leaves
                  six boards sitting empty on the day they are created. This is
                  what seeds them, and it is the Pin worth making anyway: a
                  shelf URL holds dozens of products behind one click and keeps
                  working, where a Pin per product made in volume is the shape
                  their community guidelines limit (section 4e).

                  The cover is the shelf's lead product rather than the room's
                  artwork. Pinterest reads the image to decide what a Pin is
                  about, and a photograph of the actual clothes is what somebody
                  searching Harajuku fashion is looking for. The mascot art
                  leads the room Pin at the top, where the subject really is the
                  room.
                */}
                {products[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      logEvent('pin_click', { cat: section.key, meta: 'decora-shelf' })
                      pinCollection({
                        path: `/decora#${section.key}`,
                        title: section.title,
                        tagline: section.blurb,
                        image: products[0].image,
                        ...decoraSectionPin(section.key),
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
                    <ProductCard key={p.id} product={p} pin={pinFor(p)} />
                  ))}
                </div>
              </section>
            ))}

            {/* ═════════════════════════════ THE GRUMPY EDIT */}
            {edit.length > 0 && (
              <section id="edit" className="mb-12 scroll-mt-6">
                <div className="relative overflow-hidden rounded-[26px] border-[4px] border-[#ff2d92] bg-[#1d0d33] p-5 sm:p-7">
                  {/* Leopard, at 12%, only behind this one panel. The Edit is
                      the page's editorial voice, so it gets a treatment the
                      product sections do not. */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.12] bg-repeat"
                    style={{ backgroundImage: `url(${IMG}pat-leopard.webp)`, backgroundSize: '180px auto' }}
                  />
                  <Image
                    src={`${IMG}wreath-heart.webp`}
                    alt=""
                    aria-hidden
                    width={520}
                    height={400}
                    className="pointer-events-none absolute -right-8 -top-10 w-[210px] h-auto opacity-40 rotate-[8deg] hidden sm:block"
                  />
                  <div className="relative flex items-center gap-4 flex-wrap mb-3">
                    <Image
                      src={`${IMG}st-bunny.webp`}
                      alt=""
                      width={430}
                      height={320}
                      className="h-[96px] w-auto drop-shadow-[0_6px_14px_rgba(0,0,0,.5)]"
                    />
                    <div>
                      <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.24em] text-[#25e0e8]">
                        One piece per house
                      </span>
                      <h2
                        className="font-display font-extrabold text-[34px] sm:text-[44px] leading-[0.98] text-white"
                        style={{ textShadow: '3px 3px 0 #8b3dff' }}
                      >
                        The Edit
                      </h2>
                    </div>
                  </div>
                  <p className="relative text-[14.5px] font-semibold text-[#c9b4e8] mb-5 max-w-[64ch] leading-relaxed">
                    A tour rather than a top ten. We cannot see what sells on their site, only what
                    gets clicked on ours, so this is one thing from each of the Japanese labels the
                    shops are known for.
                  </p>
                  <div className="relative grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                    {edit.map((p) => (
                      <ProductCard key={`edit-${p.id}`} product={p} pin={pinFor(p)} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ═════════════════════════════ WHERE IT COMES FROM */}
        {/* THE WALK HOME. A full-bleed band, the one place on the page where a
            scene gets to be a scene rather than a texture: it closes the shelf
            and hands over to the plain attribution block below, which is the
            one part that must not look decorated. */}
        <section aria-hidden className="relative -mx-4 sm:-mx-6 mt-6 mb-6 overflow-hidden">
          <div className="relative h-[150px] sm:h-[230px]">
            <Image
              src={`${IMG}scene-street.webp`}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Fades into the page top and bottom so the band has no hard seam. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, #12071f 0%, rgba(18,7,31,0) 26%, rgba(18,7,31,0) 68%, #12071f 100%)',
              }}
            />
          </div>
        </section>

        {/* WHERE IT ALL COMES FROM. Each shop's own words about itself, never
            ours about them, and nothing time-sensitive: a page cached for six
            hours cannot keep a promise about stock or delivery. */}
        <section className="relative overflow-hidden rounded-[22px] border-2 border-[#8b3dff] bg-[#180b2a] p-5 sm:p-6 mt-4">
          <Image
            src={`${IMG}charms-c.webp`}
            alt=""
            aria-hidden
            width={520}
            height={220}
            className="pointer-events-none absolute -right-6 -top-4 w-[180px] h-auto opacity-30 rotate-[-6deg] hidden sm:block"
          />
          <Image
            src={`${IMG}frame-polaroid.webp`}
            alt=""
            aria-hidden
            width={520}
            height={400}
            className="pointer-events-none absolute -left-10 -bottom-8 w-[190px] h-auto opacity-25 rotate-[-10deg] hidden lg:block"
          />
          <h2 className="relative font-display font-extrabold text-[19px] text-white mb-1">
            Where it comes from
          </h2>
          <p className="relative text-[13px] font-semibold text-[#9a86c4] leading-relaxed max-w-[72ch] mb-4">
            Kawaii Katz is the editorial. These are the shops that actually stock and ship it.
          </p>

          {SHOPS.map((shop) => (
            <div key={shop.vendor} className="relative border-t border-[#3a2359] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
              <h3 className="font-display font-extrabold text-[16px] text-white">{shop.vendor}</h3>
              <p className="text-[14px] font-semibold text-[#c9b4e8] leading-relaxed max-w-[72ch] mt-1">
                Describes itself as carrying {shop.says}, and says orders ship from{' '}
                {shop.shipsFrom}. Labels on its shelves include {shop.brands.join(', ')}. Those
                are its words about its own shop, not a promise from us.
              </p>
              <a
                href={shop.home}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={() => logEvent('outbound_click', { vendor: shop.vendor, meta: 'decora-shop-note' })}
                className="inline-block mt-3 bg-[#ff2d92] text-white border-[3px] border-white rounded-full px-5 h-10 leading-[34px] font-display font-extrabold text-[13.5px] hover:bg-white hover:text-[#ff2d92] transition-colors"
              >
                Visit {shop.vendor} →
              </a>
            </div>
          ))}

          <p className="relative text-[13px] font-semibold text-[#9a86c4] leading-relaxed max-w-[72ch] mt-5 pt-4 border-t border-[#3a2359]">
            Prices and availability come from each shop&apos;s live catalogue and change without
            us knowing. We are not affiliated with, endorsed by, or speaking for any of them, the
            labels named above are their trademarks and not ours, and the characters on this page
            are Kawaii Katz&apos;s own. Links out are affiliate links.
          </p>
        </section>
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={live} />
      {/* `tone` rather than the kawaii palette: this room runs hot pink, violet
          and near-black, and a coral bubble on it would read as a widget from
          another site. Same component, same behaviour. */}
      <FloatingCart products={live} onOpen={() => setCartOpen(true)} tone="decora" />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={live} />
    </div>
  )
}
