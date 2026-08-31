'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'

import { useVendorCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { useStore } from '@/lib/store'
import { affiliateUrl, vendorCfg, money, type Product } from '@/lib/data'
import { logEvent } from '@/lib/site-events'
import { pinCollection } from '@/lib/pinterest'
import { EverblogHero, EverblogAccessory } from './EverblogCards'
import FloatingCart from '@/components/FloatingCart'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'

const VENDOR = 'Everblog US'

/**
 * Rows that are not products.
 *
 * Their feed carries a $0.98 "Worry-Free Purchase" line, which is a checkout
 * add-on rather than a thing you buy. It cost nothing to leave in the catalogue
 * and everything to leave on this page: it is the cheapest row, so the header
 * read "prices start at $0.98" for a shop whose calendars are $249 and $349.
 * That is exactly the invented number the rest of this page is built to avoid,
 * and it was invented by arithmetic rather than by anyone writing it.
 *
 * The test is the BRAND, not the price. Every real row here says Everblog,
 * FridgeCal or HomeCal in its name, because it is a single-product shop with
 * accessories; a warranty line does not. A price floor would have been the
 * obvious rule and the wrong one, since a genuine $2 accessory is a thing they
 * could sell tomorrow.
 */
const BRAND = /everblog|fridgecal|homecal/i

/**
 * The calendars, and the things you bolt onto a calendar.
 *
 * Two shapes rather than one grid, because the shelf is genuinely two things:
 * a $249 device and a $349 device, then four accessories that only make sense
 * once you own one. A uniform grid of six gave the $19.90 stylus the same
 * weight as the product the page is about.
 *
 * Split on the NAME, which is the only field that distinguishes them: both
 * calendars say Calendar and none of the accessories does (Wooden Frame,
 * Charging Dock, Magnetic Stylus, Stand). It degrades in both directions on
 * purpose. If they rename and nothing matches, every row renders as a hero,
 * which is over-generous rather than broken; if everything matches, the
 * accessories row simply does not render.
 */
const IS_CALENDAR = /\bcalendar\b/i

/**
 * Everblog's own hero photograph, the one their storefront opens with.
 *
 * -----------------------------------------------------------------------------
 * TWO CROPS, NOT ONE, AND THAT IS THE WHOLE POINT
 *
 * They ship a 5760x2400 landscape for desktop and a SEPARATE 4000x5000 portrait
 * for phones, switching at 699px. Taking only the landscape and letting CSS
 * cover-crop it on a phone would throw away the crop a photographer already
 * made and leave a sliver of a wide kitchen shot. A <picture> with their own
 * breakpoint uses the frame each device was given.
 *
 * This is also why it is not `ProductImage`: that component is one <img> with a
 * retry, which is right for a product tile and cannot do art direction.
 *
 * -----------------------------------------------------------------------------
 * PROXIED, AND THE WIDTH IS BAKED INTO THE URL
 *
 * /api/img is same-origin, so the browser is fetching from us and CORS and
 * robots.txt do not enter into it (§4f's `unproxied()` rule is for URLs handed
 * to something OUTSIDE this site, which is the opposite case). The proxy
 * allowlists `cdn.shopify.com` only, so these use the CDN host rather than the
 * everblog.com/cdn/shop path their page prints, and `width` is set inside the
 * proxied URL rather than passed as `w` because the `w` ladder tops out at 900
 * and a full-bleed banner wants more than that.
 */
const CDN = 'https://cdn.shopify.com/s/files/1/0697/7136/2538/files'
const proxy = (file: string, version: string, width: number) =>
  `/api/img?u=${encodeURIComponent(`${CDN}/${file}?v=${version}&width=${width}`)}`

const HERO_WIDE = proxy('E2-_banner-calendar.jpg', '1787906692', 1600)
const HERO_TALL = proxy(
  'E2-_banner-calendar_caa44231-38a0-4068-b9cd-e4aefe8cc0b1.jpg',
  '1787906695',
  1000
)

/**
 * Everblog's showcase.
 *
 * -----------------------------------------------------------------------------
 * WHY A PARTNER WHO SELLS NO KAWAII IS ON THIS SITE AT ALL
 *
 * The same call BRKOX and GiftLAB got, for the same reason and with the same
 * boundary: a real partner whose stock is a different shape from the shelf gets
 * a room of its own rather than being scattered through a grid of plushies
 * where it would help nobody. `VendorConfig.showcase` also keeps it OUT of the
 * main grid, which is the point: a $349 wall calendar between a $12 plushie and
 * a pencil case reads as a mis-click.
 *
 * The thread it belongs to is real and already runs through the site: MamaRaya's
 * baby gifts, Montessori & Me's routine charts, the whole `learning` shelf. The
 * person buying a plushie for a seven year old is usually the person running
 * the seven year old's week.
 *
 * -----------------------------------------------------------------------------
 * EVERY CLAIM ON THIS PAGE IS SOURCED, AND THE PRICES ARE NOT CLAIMS AT ALL
 *
 * Prices come from the live feed and nothing here hardcodes one. A page cached
 * for six hours cannot promise a number, and the site has never invented stock,
 * availability or a discount (§4c, and the EVER10 note in lib/data.ts: their
 * terms name a code and never say what it takes off, so we do not show it).
 *
 * The review line is attributed rather than asserted, because it is somebody
 * else's measurement and it will drift.
 *
 * -----------------------------------------------------------------------------
 * IT WORKS WITH AN EMPTY FEED, WHICH IS NOT HYPOTHETICAL
 *
 * This went live unprobed on Jacob's call, so `products.json` answering nothing
 * is a live possibility, and the §4c batch is the precedent: of seven approved
 * partnerships, one returned a readable feed. An empty grid here still shows
 * the pitch and still sends a tracked click, so the page earns either way
 * instead of reading as broken.
 */
export default function EverblogClient({ initialProducts }: { initialProducts: Product[] }) {
  const { products, allProducts, loading } = useVendorCatalog(VENDOR, initialProducts)
  const { excludedIds } = useExclusions()
  const { state } = useStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)

  const cfg = vendorCfg(VENDOR)
  const visible = useMemo(
    () => products.filter((p) => !excludedIds.has(p.id) && BRAND.test(p.name)),
    [products, excludedIds]
  )
  /** See IS_CALENDAR: heroes, then accessories, and either may be empty. */
  const heroes = useMemo(() => {
    const c = visible.filter((p) => IS_CALENDAR.test(p.name))
    return c.length ? c : visible
  }, [visible])
  const accessories = useMemo(
    () => visible.filter((p) => !heroes.includes(p)),
    [visible, heroes]
  )

  const from = useMemo(() => {
    const ps = visible.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    return ps.length ? ps[0] : 0
  }, [visible])

  /** The tracked link to the shop itself, for the empty state and the footer. */
  const shopLink = affiliateUrl('https://everblog.com', VENDOR)

  /**
   * The hero photograph is the biggest thing on the page, so it is a link, and
   * it goes where their own banner goes: the FridgeCal. Falls back to the shop
   * when the feed has not come through, because a hero that leads nowhere is
   * worse than a hero that leads to the front door.
   */
  const heroTarget = heroes.find((p) => /fridgecal/i.test(p.name))
  const heroLink = heroTarget ? affiliateUrl(heroTarget.url, VENDOR) : shopLink

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <header className="border-b-4 border-[#7fc4d4] bg-gradient-to-br from-[#e8f6f9] to-[#fffaf0]">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/"
            className="font-display text-[13.5px] font-extrabold text-[#7fc4d4] hover:underline"
          >
            ← Back to Kawaii Katz
          </Link>

          {/* Full bleed inside the padded column: negative margins rather than
              moving it out of the header, so it keeps its place in the reading
              order and the back link still comes first.

              Capped in height because a 2.4:1 banner on a 2560px monitor is
              1,066px tall otherwise, which is a screen and a half of one
              photograph. object-cover then trims top and bottom, and the
              subject of a kitchen banner is in the middle of it. */}
          <a
            href={heroLink}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => logEvent('outbound_click', { vendor: VENDOR, meta: 'everblog-hero-banner' })}
            className="mt-5 -mx-4 block overflow-hidden bg-[#e8f6f9] sm:-mx-6 sm:rounded-[22px]"
          >
            <picture>
              <source media="(max-width: 699px)" srcSet={HERO_TALL} />
              <img
                src={HERO_WIDE}
                alt="The Everblog FridgeCal on a family kitchen fridge"
                width={5760}
                height={2400}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="max-h-[560px] w-full object-cover object-center sm:max-h-[480px]"
              />
            </picture>
          </a>

          <div className="mt-6 flex flex-wrap items-start gap-5">
            <div className="text-[54px] leading-none">{cfg?.showcase?.emoji ?? '📅'}</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[34px] font-extrabold leading-[1.05] text-[#4f4550] sm:text-[46px]">
                Everblog
              </h1>
              <p className="mt-1 font-display text-[16px] font-extrabold text-[#7fc4d4]">
                {cfg?.showcase?.tagline}
              </p>
              <p className="mt-3 max-w-[68ch] text-[15px] font-semibold leading-relaxed text-[#4f4550]">
                {cfg?.showcase?.intro}
              </p>
            </div>
          </div>

          {/* Three things a shopper actually wants to know, and nothing we
              cannot stand behind. "No subscription" is the merchant's own
              headline feature and the thing every reviewer led with. */}
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {[
              'No subscription',
              'A profile for everyone in the house',
              'Chores that turn into stars',
              'Fridge or wall',
            ].map((f) => (
              <li
                key={f}
                className="rounded-full border-2 border-[#bfe3ea] bg-white px-3.5 py-1.5 font-display text-[12.5px] font-extrabold text-[#4f4550]"
              >
                {f}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[12.5px] font-semibold leading-relaxed text-[#9a8fa3]">
            Rated 4.7 out of 5 across 358 reviews on Trustpilot, and reviewed by Notebookcheck,
            The Gadgeteer, TWICE and Poc Network. Those are their numbers and other people&rsquo;s
            write-ups, not ours.
          </p>

          {/* Pin the PAGE, not a product.
              This is the Pin worth making and lib/pinterest.ts says why: a
              collection URL holds the whole shelf behind one click and keeps
              working, where a Pin per product made in volume is the shape
              Pinterest's community guidelines limit. One press seeds a new
              board; the per-card buttons fill it in.

              The image is their own hero banner. It is a proxied /api/img path
              here and pinCollection() calls unproxied() on it, because
              robots.txt disallows /api/ and Pinterest is the one fetching it.
              That is the §4f rule, and this is the fifth place it applies. */}
          <button
            type="button"
            onClick={() => {
              logEvent('pin_click', { vendor: VENDOR, meta: 'everblog-collection' })
              pinCollection({
                path: '/everblog',
                // No colon in either half. pinCollection joins them with one,
                // so a colon here gave the caption three of them.
                title: 'The family calendar that lives on the fridge',
                tagline:
                  'a profile for everyone in the house, chores that turn into stars, one shopping list instead of four, and no subscription',
                image: HERO_WIDE,
                tag: 'FamilyCalendar',
                tags: [
                  'FamilyOrganization',
                  'FamilyCommandCenter',
                  'ChoreChart',
                  'KitchenOrganization',
                  'KawaiiKatz',
                ],
                tail: 'Found on Kawaii Katz.',
              })
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border-[3px] border-[#e60023] bg-[#e60023] px-5 py-2.5 font-display text-[14px] font-extrabold text-white transition-opacity hover:opacity-90"
            title="Pin this whole page to one of your boards"
          >
            📌 Pin this collection
          </button>

          <p className="mt-4 max-w-[72ch] text-[12.5px] font-semibold leading-relaxed text-[#9a8fa3]">
            We do not sell any of this. Everblog stock it and ship it, you check out on their
            site, and our links are affiliate links, so we may earn a commission when you buy.
            {from > 0 ? ` Prices come from their live feed and start at ${money(from)}.` : ''}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        {visible.length > 0 ? (
          <>
            <h2 className="font-display text-[24px] font-extrabold text-[#4f4550]">
              {heroes.length === 1 ? 'The calendar' : 'The calendars'}
            </h2>
            <p className="mt-1 text-[13.5px] font-semibold text-[#9a8fa3]">
              Two sizes: one that magnets onto the fridge, one that hangs on the wall.
            </p>
            <div className="mt-4 grid gap-4">
              {heroes.map((p, i) => (
                <EverblogHero key={p.id} p={p} priority={i === 0} />
              ))}
            </div>

            {accessories.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-[24px] font-extrabold text-[#4f4550]">
                  Add to it
                </h2>
                <p className="mt-1 text-[13.5px] font-semibold text-[#9a8fa3]">
                  Frames, stands and the stylus, for once one is on the wall.
                </p>
                <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                  {accessories.map((p) => (
                    <EverblogAccessory key={p.id} p={p} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* The empty state is a real page, not an apology. See the note above:
             this shipped unprobed, and a showcase that still explains the thing
             and still sends a tracked click earns either way. */
          <div className="rounded-[22px] border-[3px] border-[#bfe3ea] bg-white p-6 text-center sm:p-10">
            <p className="font-display text-[20px] font-extrabold text-[#4f4550]">
              {loading ? 'Loading their shelf' : 'Their shelf is not showing here yet'}
            </p>
            <p className="mx-auto mt-2 max-w-[52ch] text-[14px] font-semibold leading-relaxed text-[#9a8fa3]">
              {loading
                ? 'One moment.'
                : 'We read their catalogue every few hours and it has not come through yet. Everblog are open and shipping in the meantime.'}
            </p>
            {!loading && (
              <a
                href={shopLink}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={() => logEvent('outbound_click', { vendor: VENDOR, meta: 'everblog-empty' })}
                className="mt-5 inline-block rounded-full border-[3px] border-[#7fc4d4] bg-[#7fc4d4] px-6 py-3 font-display text-[14px] font-extrabold text-white transition-colors hover:bg-white hover:text-[#7fc4d4]"
              >
                Visit Everblog →
              </a>
            )}
          </div>
        )}

        <section className="mt-10 rounded-[22px] border-[3px] border-[#bfe3ea] bg-white p-6">
          <h2 className="font-display text-[19px] font-extrabold text-[#4f4550]">
            Why this is on a kawaii site
          </h2>
          <p className="mt-2 max-w-[70ch] text-[14px] font-semibold leading-relaxed text-[#4f4550]">
            Because it is the same shopper. Half of what we carry is bought by a parent for a
            kid: the wooden toys, the routine charts, the lunch boxes, the plushie that has to
            arrive before a birthday. Everblog is the thing that keeps the birthday on the
            fridge. We would rather point at one good version of it than pretend the category
            does not exist.
          </p>
          <a
            href={shopLink}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => logEvent('outbound_click', { vendor: VENDOR, meta: 'everblog-note' })}
            className="mt-4 inline-block rounded-full border-[3px] border-[#7fc4d4] px-5 py-2.5 font-display text-[13.5px] font-extrabold text-[#7fc4d4] transition-colors hover:bg-[#7fc4d4] hover:text-white"
          >
            See it on everblog.com →
          </a>
        </section>
      </main>

      {/* Same bubble and same confirmation as every other room, because a
          visitor arriving here from the grid has a cart already. */}
      <FloatingCart products={allProducts} onOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={allProducts} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={allProducts} />
      {state.wish.length > 0 && (
        <button
          type="button"
          onClick={() => setWishOpen(true)}
          className="fixed bottom-4 left-4 z-50 rounded-full border-[3px] border-[#ff5a7a] bg-white px-4 py-2.5 font-display text-[13px] font-extrabold text-[#ff5a7a] shadow-[0_8px_24px_rgba(0,0,0,.15)]"
        >
          ♥ My Board ({state.wish.length})
        </button>
      )}
    </div>
  )
}
