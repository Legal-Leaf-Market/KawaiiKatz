'use client'
import { useState } from 'react'

import { useStore } from '@/lib/store'
import { affiliateUrl, money, type Product } from '@/lib/data'
import { logEvent } from '@/lib/site-events'
import { pinProductPage, type PinContext } from '@/lib/pinterest'
import ProductImage from '@/components/ProductImage'

const VENDOR = 'Everblog US'

/**
 * Everblog's own cards.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS PAGE DOES NOT USE ProductCard
 *
 * Jacob, on the first version: the photos do not look right, the description
 * truncates with no way to open it, rethink the card. All three are the same
 * cause. ProductCard is built for a grid of two thousand kawaii products and it
 * is very good at that job, which is why it crops to `aspect-[4/5]` with
 * `object-cover` (a plushie is a square subject on a plain ground and a tall
 * tile packs a grid) and why it shows two lines of a 140-character blurb.
 *
 * Everblog is six products and none of them is that shape. The photographs are
 * wide room shots of a calendar on a fridge or a wall, so a 4:5 cover crop cuts
 * the calendar out of a picture whose whole subject is the calendar. And a $349
 * device is a considered purchase: the description is the point, not a caption.
 *
 * -----------------------------------------------------------------------------
 * `object-contain` ON A TINTED PANEL, NOT `object-cover`
 *
 * Contain shows the whole photograph and leaves letterbox room, which reads as
 * a mistake against white and as a deliberate mat against a tint. The panel is
 * the site's own cornflower wash, so the page still looks like Kawaii Katz
 * while the cards stop pretending to be plushie tiles.
 *
 * -----------------------------------------------------------------------------
 * EVERY FACT ON A CARD COMES FROM THE FEED
 *
 * Prices, sale prices, the "from", the finishes and the bundles are all read
 * from the live row. Nothing here hardcodes a number or invents an option, for
 * the reason the page header already gives: this site has never made up stock,
 * availability or a discount, and a page cached for six hours could not stand
 * behind one anyway.
 */

/**
 * The Pin voice for this room, and why it is not the site's default.
 *
 * `pinCaption()` would write "a kawaii gift pick from Everblog US ... cute,
 * clever & kind" and tag it `#KawaiiFinds #CuteStuff`, because these rows are
 * categorised `other` and `tech`. Publishing a $349 family calendar to a board
 * about kawaii under that caption is the exact defect §4f-b was written for:
 * the Pin's topic disagreeing with the board on both halves.
 *
 * `PinContext` already carries the four overrides that fix it, so this is the
 * same mechanism a Decora board uses, pointed at a different shelf.
 *
 * The lead noun is per-product rather than fixed. Calling the $19.90 stylus
 * "a family calendar pick" would be the caption lying about what is in the
 * photograph.
 */
export function everblogPin(p: Product): PinContext {
  return {
    tag: 'FamilyCalendar',
    catLead: /calendar/i.test(p.name) ? 'family calendar' : 'calendar accessory',
    catTags: [
      'FamilyOrganization',
      'FamilyCommandCenter',
      'ChoreChart',
      'SmartHome',
      'KitchenOrganization',
    ],
    style: 'digital',
    tail: 'One calendar for the whole house, found on Kawaii Katz.',
    vendor: 'Everblog',
  }
}

/**
 * The Pin button, on every card.
 *
 * It pins `/p/<id>` rather than the merchant deep link, which is the rule
 * lib/pinterest.ts states in as many words: a Pin at an affiliate URL IS an
 * affiliate Pin, and those are what Pinterest's community guidelines limit in
 * volume. `pinProductPage` does that for us.
 */
function PinButton({ p, label = false }: { p: Product; label?: boolean }) {
  const onClick = () => {
    logEvent('pin_click', { productId: p.id, vendor: VENDOR, cat: p.cat })
    pinProductPage(p, everblogPin(p))
  }
  if (label) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-[#e60023] bg-white px-4 py-2.5 font-display text-[13.5px] font-extrabold text-[#e60023] transition-colors hover:bg-[#e60023] hover:text-white"
        title={`Pin ${p.name} to one of your boards`}
      >
        📌 Pin
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#e60023] bg-white text-[15px] text-[#e60023] transition-colors hover:bg-[#e60023] hover:text-white"
      aria-label={`Pin ${p.name} to Pinterest`}
      title="Pin this to one of your boards"
    >
      📌
    </button>
  )
}

/** Shared by both card shapes: the tracked outbound link. */
function shopUrl(p: Product) {
  return affiliateUrl(p.url, VENDOR)
}

function track(p: Product, where: string) {
  logEvent('outbound_click', { vendor: VENDOR, productId: p.id, meta: where })
}

/**
 * Price, sale price and the "from".
 *
 * `unit` carries the word "from" for a multi-variant row, which is the feed's
 * way of saying the number is a floor. Showing it matters here more than it
 * does in the grid: the difference between the HomeCal at $349 and the same
 * calendar with an oak frame at $429 is a real decision, not a rounding.
 */
function Price({ p, big = false }: { p: Product; big?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      {p.unit === 'from' && (
        <span className="font-display text-[12px] font-extrabold uppercase tracking-wide text-[#9a8fa3]">
          from
        </span>
      )}
      <span
        className={`font-display font-extrabold text-[#4f4550] ${big ? 'text-[34px] leading-none' : 'text-[22px] leading-none'}`}
      >
        {money(p.price)}
      </span>
      {p.onSale && p.wasPrice > p.price && (
        <>
          <span className="font-display text-[15px] font-bold text-[#9a8fa3] line-through">
            {money(p.wasPrice)}
          </span>
          <span className="rounded-full bg-[#ff5a7a] px-2.5 py-1 font-display text-[11.5px] font-extrabold text-white">
            {p.discountPct}% off
          </span>
        </>
      )}
    </div>
  )
}

/**
 * The variants, as readable options rather than a <select>.
 *
 * The feed carries them and the grid card hides them behind a dropdown. On a
 * six-product page they are most of what a shopper is deciding between: three
 * frame finishes, a calendar with or without the dual stylus, a calendar with
 * or without a frame at $80 more. A row of chips says that at a glance; a
 * closed dropdown says nothing at all.
 *
 * Priced only where the prices differ. Oak, Walnut and Charcoal are all $99, so
 * printing $99 three times is noise.
 */
function Variants({ p }: { p: Product }) {
  const named = p.variants.filter((v) => v.title)
  if (named.length < 2) return null
  const spread = new Set(named.map((v) => v.price)).size > 1

  return (
    <div className="mt-3.5">
      <p className="font-display text-[11.5px] font-extrabold uppercase tracking-wide text-[#9a8fa3]">
        {named.length} options
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {named.map((v) => (
          <li
            key={v.id}
            className="rounded-lg border-2 border-[#dfeef2] bg-[#f4fbfd] px-2.5 py-1 font-display text-[12px] font-bold text-[#4f4550]"
          >
            {v.title}
            {spread && v.price > 0 && (
              <span className="ml-1.5 font-extrabold text-[#7fc4d4]">{money(v.price)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The description, and a Read more that actually reveals something.
 *
 * `details` is carried through the scrape for showcase vendors only (§ the note
 * on Product.details). Where it is missing the card falls back to `blurb` and
 * simply does not offer the toggle, which is the honest outcome: the charging
 * dock has no description in the feed at all, and a "read more" that opens onto
 * the same sentence is the defect this replaced.
 */
function Description({ p, clamp }: { p: Product; clamp: string }) {
  const [open, setOpen] = useState(false)
  const long = p.details ?? ''
  const short = p.blurb ?? ''
  if (!short && !long) return null

  const canOpen = long.length > short.length
  const text = open && canOpen ? long : short

  return (
    <div className="mt-3">
      <p className={`text-[13.5px] font-semibold leading-relaxed text-[#4f4550] ${open ? '' : clamp}`}>
        {text}
      </p>
      {canOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 font-display text-[12.5px] font-extrabold text-[#7fc4d4] hover:underline"
          aria-expanded={open}
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

function AddToCart({ p, full = false }: { p: Product; full?: boolean }) {
  const { dispatch } = useStore()
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex: 0 })}
      className={`rounded-full border-[3px] border-[#bfe3ea] bg-white px-5 py-2.5 font-display text-[13.5px] font-extrabold text-[#4f4550] transition-colors hover:border-[#7fc4d4] ${full ? 'w-full' : ''}`}
    >
      Save to cart
    </button>
  )
}

/**
 * The hero card, for a product that IS the shop.
 *
 * Photo beside the detail on a desktop rather than above it, because these
 * photographs are landscape and stacking a 16:10 image over a paragraph makes a
 * card taller than a screen. Stacked on a phone, where there is no other
 * option.
 */
export function EverblogHero({ p, priority }: { p: Product; priority?: boolean }) {
  return (
    <article className="overflow-hidden rounded-[24px] border-[3px] border-[#bfe3ea] bg-white shadow-[0_10px_30px_rgba(127,196,212,.14)]">
      <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex items-center justify-center bg-gradient-to-br from-[#eaf7fa] to-[#f7fdff] p-5 md:p-6">
          <div className="relative aspect-[16/10] w-full">
            <ProductImage
              src={p.image}
              alt={p.name}
              fallback="📅"
              width={620}
              priority={priority}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-6">
          <h3 className="font-display text-[21px] font-extrabold leading-tight text-[#4f4550] sm:text-[24px]">
            {p.name}
          </h3>
          <div className="mt-3">
            <Price p={p} big />
          </div>
          <Variants p={p} />
          <Description p={p} clamp="line-clamp-4" />

          <div className="mt-auto flex flex-wrap gap-2.5 pt-5">
            <a
              href={shopUrl(p)}
              target="_blank"
              rel="nofollow sponsored noopener"
              onClick={() => track(p, 'everblog-hero')}
              className="rounded-full border-[3px] border-[#7fc4d4] bg-[#7fc4d4] px-6 py-2.5 font-display text-[13.5px] font-extrabold text-white transition-colors hover:bg-white hover:text-[#7fc4d4]"
            >
              Buy on Everblog →
            </a>
            <AddToCart p={p} />
            <PinButton p={p} label />
          </div>
        </div>
      </div>
    </article>
  )
}

/**
 * The accessory card. Same anatomy, smaller, and it still opens its
 * description: an add-on is exactly the thing a shopper does not already
 * understand from its name.
 */
export function EverblogAccessory({ p }: { p: Product }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border-[3px] border-[#e3f1f5] bg-white shadow-[0_6px_18px_rgba(127,196,212,.10)] transition-colors hover:border-[#bfe3ea]">
      <div className="flex items-center justify-center bg-gradient-to-br from-[#eaf7fa] to-[#f7fdff] p-4">
        <div className="relative aspect-[4/3] w-full">
          <ProductImage
            src={p.image}
            alt={p.name}
            fallback="📅"
            width={360}
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[15px] font-extrabold leading-tight text-[#4f4550]">
          {p.name}
        </h3>
        <div className="mt-2.5">
          <Price p={p} />
        </div>
        <Variants p={p} />
        <Description p={p} clamp="line-clamp-3" />

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <a
            href={shopUrl(p)}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => track(p, 'everblog-accessory')}
            className="rounded-full border-[3px] border-[#7fc4d4] bg-[#7fc4d4] px-4 py-2 text-center font-display text-[13px] font-extrabold text-white transition-colors hover:bg-white hover:text-[#7fc4d4]"
          >
            Buy on Everblog →
          </a>
          <div className="flex gap-2">
            <AddToCart p={p} full />
            <PinButton p={p} />
          </div>
        </div>
      </div>
    </article>
  )
}
