'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { catEmoji, money, isNewItem, type Product } from '@/lib/data'
import { pinProductPage } from '@/lib/pinterest'
import { logEvent } from '@/lib/site-events'
import { rankSimilar } from '@/lib/similar'
import { shouldNudge, type TasteProfile, type TasteSignal } from '@/lib/taste'
import { useTaste } from '@/hooks/useTaste'
import ProductImage from './ProductImage'

type Props = {
  product: Product
  /** True only when THIS card is an injected "Ada's Pick" feed card (gold glow + badge). */
  isFeedPick?: boolean
  /** True when the product is in Ada's picks — only drives the star toggle state in Ada Mode. */
  isPicked?: boolean
  /** True when the product is on the global store-exclusion kill-list. */
  isExcluded?: boolean
  isAdaMode?: boolean
  onTogglePick?: (p: Product) => void
  /** Ada-mode only: toggle this product on/off the live store. */
  onToggleExclude?: (p: Product, currentlyExcluded: boolean) => void
  /** Set on the first rows of the grid — those are visible without scrolling. */
  priority?: boolean
  /**
   * Catalogue the card's flip side draws its "more like this" pair from. Pass
   * the same list the cart resolves against, minus anything excluded — a
   * suggestion the visitor cannot actually buy is worse than no suggestion.
   * Omitted (or empty) simply means the card never offers a flip.
   */
  similarPool?: Product[]
}

export default function ProductCard({ product: p, isFeedPick: isFeedPickProp, isPicked, isExcluded, isAdaMode, onTogglePick, onToggleExclude, priority = false, similarPool = [] }: Props) {
  const { state, dispatch } = useStore()
  const router = useRouter()
  const [selVariant, setSelVariant] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [flipped, setFlipped] = useState(false)

  /**
   * The card's own product page, and the whole lower half of the card as the
   * way to it.
   *
   * A real <Link> on the title and on the View item button carries the keyboard,
   * middle-click and open-in-new-tab cases; this handler is the mouse
   * convenience on top, which is why the body is a plain div and not an anchor.
   * Wrapping it in one would nest a <select>, three <button>s and the blurb's
   * more/less toggle inside an <a> — invalid, and it breaks the variant picker
   * outright.
   *
   * Two things are deliberately not a navigation:
   *   - a click that landed on any control inside the body, and
   *   - a click that ends a text selection, which is someone reading the blurb
   *     rather than asking to leave the page.
   */
  const productHref = `/p/${p.id}`
  function openProduct(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('a, button, select, input, label, [role="button"]')) return
    if ((window.getSelection()?.toString() ?? '').length > 0) return
    router.push(productHref)
  }
  const [addedBoth, setAddedBoth] = useState(false)
  const { taste, record } = useTaste()

  /**
   * The pair currently on the flip side, and every id this card has already
   * shown. Held as state rather than derived by index from a ranked list,
   * because the ranking now moves under us: a thumbs-down re-ranks immediately,
   * and an index into a list that just changed points at something arbitrary.
   * Keeping the pair explicit also lets a thumbs-down replace one tile instead
   * of both.
   */
  const [picks, setPicks] = useState<Product[]>([])
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const [poolSize, setPoolSize] = useState(0)

  /**
   * Ranking the pool is cheap per card and ruinous times eighteen at mount, so
   * it waits for the first sign of interest — a hover, a focus, or the flip.
   */
  const [primed, setPrimed] = useState(false)

  const variant = p.variants[selVariant] ?? null
  const price = variant ? variant.price : p.price
  const inWish = state.wish.includes(p.id)
  const isNew = isNewItem(p)
  const isFeedPick = isFeedPickProp ?? false
  const canFlip = similarPool.length > 1

  /** Ranked shortlist under a given profile. Deep enough that shuffling has
   *  somewhere to go, including into the exploration reserve at the tail. */
  function shortlist(t: TasteProfile): Product[] {
    return rankSimilar(p, similarPool, 40, t)
  }

  function prime() {
    if (primed || !canFlip) return
    setPrimed(true)
    const list = shortlist(taste)
    setPoolSize(list.length)
    const next = list.slice(0, 2)
    setPicks(next)
    setSeen(new Set(next.map((x) => x.id)))
  }

  /** Both tiles replaced — the shuffle button. Each one shown counts as a weak
   *  "not that", which is the whole reason shuffle is a signal at all. */
  function shufflePicks() {
    let t = taste
    for (const item of picks) t = record(item, 'skip')
    const list = shortlist(t)
    setPoolSize(list.length)
    let avail = list.filter((x) => !seen.has(x.id))
    // Wrapped: everything has been shown once, so start the cycle again rather
    // than leaving the visitor on a dead button.
    const fresh = avail.length >= 2 ? seen : new Set<string>()
    if (avail.length < 2) avail = list
    const next = avail.slice(0, 2)
    setPicks(next)
    setSeen(new Set([...fresh, ...next.map((x) => x.id)]))
  }

  /** One tile replaced — a thumbs-down. The other stays put, because the
   *  visitor said nothing about it. */
  function replaceOne(item: Product, t: TasteProfile) {
    const list = shortlist(t)
    setPoolSize(list.length)
    let cand = list.find((x) => !seen.has(x.id))
    let nextSeen = seen
    if (!cand) {
      nextSeen = new Set(picks.map((x) => x.id))
      cand = list.find((x) => !nextSeen.has(x.id))
    }
    if (!cand) return
    setSeen(new Set([...nextSeen, cand.id]))
    setPicks((cur) => cur.map((x) => (x.id === item.id ? cand! : x)))
  }

  function vote(item: Product, signal: TasteSignal) {
    const next = record(item, signal)
    if (signal === 'down') replaceOne(item, next)
  }

  function addToCart() {
    dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex: selVariant })
    record(p, 'cart')
  }

  function addBoth() {
    for (const item of picks) {
      dispatch({ type: 'ADD_TO_CART', productId: item.id, variantIndex: 0 })
      record(item, 'cart')
    }
    setAddedBoth(true)
    setTimeout(() => setAddedBoth(false), 1400)
  }

  function toggleWish(e: React.MouseEvent) {
    e.preventDefault()
    dispatch({ type: 'TOGGLE_WISH', productId: p.id })
  }

  const stickerEl = (() => {
    if (p.onSale && p.discountPct) return (
      <span className="absolute top-2.5 left-2.5 bg-[#e0227a] text-white border-[3px] border-white rounded-full font-display font-extrabold text-[13.5px] px-[15px] py-[7px] z-20 shadow-[0_4px_12px_rgba(224,34,122,.5)] whitespace-nowrap">
        -{p.discountPct}% OFF
      </span>
    )
    if (isFeedPick) return (
      <span className="absolute top-2.5 left-2.5 bg-gradient-to-r from-[#ffd451] to-[#ffb300] text-[#5a3c00] border-2 border-white rounded-full font-display font-extrabold text-[11px] px-3 py-[5px] z-20 shadow-[0_3px_10px_rgba(255,170,0,.5)]">
        🎀 pick
      </span>
    )
    if (p.badge) return (
      <span className="absolute top-2.5 left-2.5 bg-[#ffd873] border-2 border-white rounded-full font-display font-extrabold text-[11px] px-3 py-[5px] z-20 shadow-[0_4px_12px_rgba(255,138,101,.18)] max-w-[calc(100%-20px)] overflow-hidden text-ellipsis whitespace-nowrap">
        {p.badge}
      </span>
    )
    if (isNew) return (
      <span className="absolute top-2.5 left-2.5 bg-[#ffd873] border-2 border-white rounded-full font-display font-extrabold text-[11px] px-3 py-[5px] z-20 shadow-[0_4px_12px_rgba(255,138,101,.18)]">
        🆕 New
      </span>
    )
    return null
  })()

  return (
    <article
      className={`kk-card bg-white rounded-[24px] overflow-hidden flex flex-col relative transition-all duration-150 cursor-default [perspective:1400px]
        ${isFeedPick
          ? 'border-[3px] border-[#ffcf3f] shadow-[0_0_0_2px_#ffe58a,0_0_18px_3px_rgba(255,193,7,.55),0_8px_24px_rgba(255,170,0,.28)] [animation:pickGlow_2.6s_ease-in-out_infinite]'
          : 'border-[3px] border-[#ffb199] shadow-[0_4px_12px_rgba(255,138,101,.18)]'}
        hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,138,101,.16)]
        sm:border-[3px] border-2 sm:rounded-[24px] rounded-[18px]
        ${isExcluded ? 'opacity-60 grayscale-[.35] !border-[#e0227a]' : ''}`
      }
      aria-label={p.name}
      onPointerEnter={prime}
      onFocusCapture={prime}
    >
      {isExcluded && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-[#e0227a] text-white font-display font-extrabold text-[11px] tracking-wide text-center py-1 uppercase">
          Hidden from store
        </div>
      )}

      <div className="kk-flip-inner" data-flipped={flipped}>
        {/* ---------- FRONT ---------- */}
        <div className="kk-face flex-1 min-h-0 flex flex-row sm:flex-col" inert={flipped}>
          {/* Image area */}
          <div
            className={`relative flex items-center justify-center overflow-hidden
              ${isFeedPick
                ? 'bg-gradient-to-br from-[#fff2c2] to-[#e6dcff]'
                : 'bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]'}
              aspect-[4/5] sm:aspect-[4/5] w-[130px] flex-[0_0_130px] sm:w-auto sm:flex-none`
            }
          >
            <div className="kk-zoom absolute inset-0">
              <div className="kk-pulse relative w-full h-full">
                <ProductImage
                  src={p.image}
                  alt={p.name}
                  fallback={catEmoji(p.cat)}
                  className="w-full h-full object-cover"
                  fallbackClassName="absolute inset-0 flex items-center justify-center text-[80px]"
                  width={400}
                  priority={priority}
                />
              </div>
            </div>

            {canFlip && (
              <>
                {/* Pointer devices: the cornflower wash fades in on hover. */}
                <button
                  type="button"
                  onClick={() => { prime(); logEvent('card_flip', { productId: p.id, vendor: p.vendor, cat: p.cat }); setFlipped(true) }}
                  className="kk-flip-wash absolute inset-0 z-10 items-center justify-center text-center px-3 cursor-pointer"
                  aria-label={`Flip ${p.name} over for more gift options`}
                >
                  Flip for more gift options
                </button>
                {/* Touch devices have no hover, so the affordance is always on. */}
                <button
                  type="button"
                  onClick={() => { prime(); setFlipped(true) }}
                  className="kk-flip-pill absolute bottom-2 left-2 z-10 items-center gap-1 bg-[rgba(100,149,237,.94)] text-white font-display font-extrabold text-[10px] leading-none px-2.5 py-[7px] rounded-full border-2 border-white shadow-[0_3px_10px_rgba(100,149,237,.45)]"
                  aria-label={`Flip ${p.name} over for more gift options`}
                >
                  ↻ flip
                </button>
              </>
            )}

            {stickerEl}
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-30">
              <button
                onClick={toggleWish}
                className={`border-2 border-[#ff5a7a] ${inWish ? 'bg-[#ff5a7a] text-white' : 'bg-white text-[#ff5a7a]'} rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] shadow-[0_4px_12px_rgba(255,138,101,.18)] flex items-center justify-center`}
                aria-label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
                title={inWish ? 'Remove from My Board' : 'Save to My Board'}
              >
                {inWish ? '♥' : '♡'}
              </button>
              <button
                onClick={() => { logEvent('pin_click', { productId: p.id, vendor: p.vendor, cat: p.cat }); pinProductPage(p) }}
                className="border-2 border-[#e60023] bg-white text-[#e60023] rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] shadow-[0_4px_12px_rgba(255,138,101,.18)] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
                aria-label={`Pin ${p.name} to Pinterest`}
                title="Share this to Pinterest"
              >
                📌
              </button>
              {isAdaMode && onTogglePick && (
                <button
                  onClick={() => onTogglePick(p)}
                  className={`border-2 border-[#b79cff] ${isPicked ? 'bg-[#b79cff] text-white' : 'bg-white text-[#b79cff]'} rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] flex items-center justify-center`}
                  aria-label={isPicked ? "Remove from Ada's Picks" : "Add to Ada's Picks"}
                  title={isPicked ? "Remove pick" : "Add to Ada's Picks"}
                >
                  {isPicked ? '★' : '☆'}
                </button>
              )}
            </div>
          </div>

          {/* Body — the whole of it is the way to the product page. */}
          <div
            className="kk-body-link p-3 sm:px-3.5 sm:pb-3.5 flex flex-col gap-1.5 flex-1 min-w-0"
            onClick={openProduct}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-[.7px] text-[#b79cff]">{p.vendor}</div>
            <h3 className="font-display text-[16.5px] sm:text-[16.5px] text-[14.5px] text-[#4f4550] leading-tight">
              {/* prefetch={false}: a grid holds forty of these and Next would
                  prefetch every one that scrolls into view, turning a page of
                  thumbnails into forty RSC requests for pages nobody opened. */}
              <Link href={productHref} prefetch={false} className="hover:text-[#6495ED] transition-colors">
                {p.name}
              </Link>
            </h3>

            {p.blurb && (
              <div className="text-[12.5px] text-[#9a8fa3] leading-relaxed">
                <span className={expanded ? '' : 'line-clamp-2'}>{p.blurb}</span>
                {p.blurb.length > 80 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="bg-none border-none text-[#7fc4d4] font-extrabold text-xs cursor-pointer p-0 ml-1 hover:underline"
                  >
                    {expanded ? 'less' : 'more'}
                  </button>
                )}
              </div>
            )}

            {/* Variant selector */}
            {p.variants.length > 1 && (
              <div className="relative mt-0.5">
                <select
                  value={selVariant}
                  onChange={(e) => setSelVariant(Number(e.target.value))}
                  className="w-full appearance-none border-[2.5px] border-[#b79cff] rounded-[14px] px-3.5 py-2.5 pr-9 font-sans font-extrabold bg-[#e6dcff] cursor-pointer text-[#4f4550] text-[13.5px] focus:outline-none focus:border-[#ff8a65]"
                  aria-label="Choose variant"
                >
                  {p.variants.map((v, i) => (
                    <option key={v.id} value={i}>
                      {v.title} - {money(v.price)}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] text-[#b79cff] font-black">▾</span>
                <span className="absolute left-3 -top-2 bg-white px-1.5 font-display text-[9px] font-extrabold tracking-[.5px] uppercase text-[#b79cff] rounded-md">choose</span>
              </div>
            )}

            {/* Price row */}
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className={`font-display text-[21px] ${p.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
                {p.unit && <span className="text-sm font-bold mr-0.5">{p.unit} </span>}
                {money(price)}
              </span>
              {p.onSale && p.wasPrice > 0 && (
                <span className="font-sans text-[13px] text-[#9a8fa3] line-through">{money(p.wasPrice)}</span>
              )}
            </div>

            {/* Coupon tag */}
            {p.couponCode && p.couponPct > 0 && (
              <div className="text-[10.5px] font-bold text-[#a3125c] bg-[#fff0f6] border-[1.5px] border-dashed border-[#e0227a] rounded-[10px] px-2 py-1 leading-tight mt-0.5 self-start">
                Extra <strong className="font-display">{p.couponPct}% off</strong> with code <strong className="font-display">{p.couponCode}</strong>
              </div>
            )}

            {/* Tags */}
            <div className="flex gap-1 flex-wrap mt-0.5">
              <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full bg-[#fffaf0] text-[#9a8fa3]">{p.cat}</span>
              {p.character && <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full text-white" style={{ background: '#b79cff' }}>{p.character}</span>}
            </div>

            {/* View item — the primary action, and the only route from a card
                to the product page. mt-auto moves here from Add to Cart so the
                pair still sits flush to the bottom of a stretched card. */}
            <Link
              href={productHref}
              prefetch={false}
              className="kk-view-pulse mt-auto border-[2.5px] border-[#3f6fd8] bg-[#6495ED] text-white font-display font-extrabold px-2.5 py-2.5 rounded-[14px] cursor-pointer text-sm text-center hover:bg-[#3f6fd8] transition-colors active:translate-y-0.5"
              aria-label={`View ${p.name}`}
            >
              View Item 👀
            </Link>

            {/* Add to cart */}
            <button
              type="button"
              onClick={addToCart}
              className="border-[2.5px] border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold px-2.5 py-2.5 rounded-[14px] cursor-pointer text-sm text-center hover:bg-[#ff8a65] hover:text-white transition-colors active:translate-y-0.5"
              aria-label={`Add ${p.name} to cart`}
            >
              Add to Cart 🛒
            </button>

            {/* Ada-mode only: big store exclusion control */}
            {isAdaMode && onToggleExclude && (
              <button
                onClick={() => onToggleExclude(p, !!isExcluded)}
                className={`mt-1 w-full border-[3px] font-display font-extrabold px-2.5 py-3 rounded-[14px] cursor-pointer text-[14px] text-center uppercase tracking-wide transition-colors active:translate-y-0.5
                  ${isExcluded
                    ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20] hover:bg-[#2e7d32] hover:text-white'
                    : 'border-[#e0227a] bg-[#e0227a] text-white hover:bg-[#a3125c]'}`}
                aria-label={isExcluded ? `Restore ${p.name} to store` : `Exclude ${p.name} from store`}
              >
                {isExcluded ? '↩ Restore to Store' : '⛔ Exclude from Store'}
              </button>
            )}
          </div>
        </div>

        {/* ---------- BACK ---------- */}
        <div
          className="kk-face kk-face-back bg-white flex flex-col p-2.5 sm:p-3 gap-2"
          inert={!flipped}
          aria-label={`Products similar to ${p.name}`}
        >
          <div className="flex items-center justify-between gap-2 shrink-0">
            <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.7px] text-[#6495ED] leading-none">
              More like this
            </span>
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="border-2 border-[#6495ED] bg-white text-[#6495ED] rounded-full w-[26px] h-[26px] shrink-0 cursor-pointer text-[13px] font-black leading-none flex items-center justify-center hover:bg-[#6495ED] hover:text-white transition-colors"
              aria-label={`Flip back to ${p.name}`}
              title="Flip back"
            >
              ✕
            </button>
          </div>

          {picks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-[12px] font-bold text-[#9a8fa3] px-2">
              Nothing close enough to suggest yet. Try the Gift Finder 🎁
            </div>
          ) : (
            <>
              {/* Stacked, not side by side: a full-width photo reads as the
                  product, a half-width one reads as a thumbnail. The shuffle
                  button lands in the gap between the two on its own. */}
              <div className="flex-1 min-h-0 flex flex-col gap-2 relative">
                {picks.map((item) => (
                  <MiniRow key={item.id} item={item} onVote={vote} onAdd={() => record(item, 'cart')} />
                ))}
                {poolSize > 2 && (
                  <button
                    type="button"
                    onClick={shufflePicks}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[38px] h-[38px] rounded-full bg-white border-[2.5px] border-[#6495ED] text-[#6495ED] text-[16px] font-black leading-none flex items-center justify-center cursor-pointer shadow-[0_3px_10px_rgba(100,149,237,.4)] hover:bg-[#6495ED] hover:text-white active:scale-90 transition-all"
                    aria-label="Shuffle in different similar products"
                    title="Shuffle more options"
                  >
                    ⇄
                  </button>
                )}
              </div>

              {picks.length === 2 && (
                <div className="hidden sm:flex shrink-0 pt-2 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={addBoth}
                    className={`w-full border-2 font-display font-extrabold px-2 py-2 rounded-[12px] cursor-pointer text-[12px] leading-none text-center transition-colors
                      ${addedBoth
                        ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
                        : 'border-[#6495ED] bg-white text-[#6495ED] hover:bg-[#6495ED] hover:text-white'}`}
                    aria-label="Add both suggestions to cart"
                  >
                    {addedBoth ? 'Both added ✓' : 'Add both 🛒'}
                  </button>
                  {shouldNudge(taste) ? (
                    <div className="text-center text-[9.5px] font-bold text-[#6495ED] leading-snug px-1">
                      Not quite it? Keep telling us with 👍 and 👎 and we&apos;ll narrow it down.
                    </div>
                  ) : (
                    <div className="text-center text-[9.5px] font-bold text-[#c9bfd1] leading-none">
                      {poolSize} similar · ⇄ to shuffle
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  )
}

/** One suggestion on a card's flip side: full-width photo, price, add. */
function MiniRow({ item, onVote, onAdd }: {
  item: Product
  onVote: (item: Product, signal: TasteSignal) => void
  onAdd: () => void
}) {
  const { dispatch } = useStore()
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  function add() {
    dispatch({ type: 'ADD_TO_CART', productId: item.id, variantIndex: 0 })
    onAdd()
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1 min-w-0">
      <div className="relative flex-1 min-h-0 rounded-[12px] overflow-hidden border-2 border-[#ffe0d6] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]">
        <ProductImage
          src={item.image}
          alt={item.name}
          fallback={catEmoji(item.cat)}
          className="w-full h-full object-cover"
          fallbackClassName="absolute inset-0 flex items-center justify-center text-[38px]"
          width={320}
        />
        {/* On the photo rather than in the caption line: the caption is already
            carrying a name, a price and a button, and these have to be reachable
            without reading anything. */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
          <button
            type="button"
            onClick={() => { setLiked(true); onVote(item, 'up') }}
            className={`w-[26px] h-[26px] rounded-full border-2 text-[12px] leading-none flex items-center justify-center cursor-pointer shadow-[0_2px_6px_rgba(79,69,80,.25)] transition-colors
              ${liked ? 'border-[#2e7d32] bg-[#c9ecd2]' : 'border-white bg-[rgba(255,255,255,.9)] hover:bg-white'}`}
            aria-label={`More like ${item.name}`}
            title="More like this"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => onVote(item, 'down')}
            className="w-[26px] h-[26px] rounded-full border-2 border-white bg-[rgba(255,255,255,.9)] text-[12px] leading-none flex items-center justify-center cursor-pointer shadow-[0_2px_6px_rgba(79,69,80,.25)] hover:bg-white transition-colors"
            aria-label={`Fewer like ${item.name}`}
            title="Not this, show me something else"
          >
            👎
          </button>
        </div>
      </div>
      {/* Price and button share a line so the photo keeps the height. */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-[9.5px] leading-tight text-[#9a8fa3] font-bold line-clamp-1" title={item.name}>
            {item.name}
          </div>
          <div className={`font-display text-[16px] leading-tight ${item.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
            {money(item.price)}
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          className={`shrink-0 border-2 font-display font-extrabold px-3 py-[7px] rounded-[11px] cursor-pointer text-[11.5px] leading-none text-center transition-colors
            ${added
              ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
              : 'border-[#ff8a65] bg-[#ffb199] text-[#4f4550] hover:bg-[#ff8a65] hover:text-white'}`}
          aria-label={`Add ${item.name} to cart`}
        >
          {added ? 'Added ✓' : 'Add 🛒'}
        </button>
      </div>
    </div>
  )
}
