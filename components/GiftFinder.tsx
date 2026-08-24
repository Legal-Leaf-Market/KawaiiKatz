'use client'
import { useState } from 'react'
import { CATEGORIES, catEmoji, money, type Product } from '@/lib/data'
import { isKidSafe } from '@/lib/kid-safe'
import { useStore } from '@/lib/store'
import { shouldNudge, tasteBonus, isLearning, type TasteProfile } from '@/lib/taste'
import { useTaste } from '@/hooks/useTaste'
import TasteNote from './TasteNote'

type Props = {
  open: boolean
  onClose: () => void
  products: Product[]
}

export default function GiftFinder({ open, onClose, products }: Props) {
  const [cat, setCat] = useState('')
  const [budget, setBudget] = useState('')
  const [picks, setPicks] = useState<Product[]>([])
  const [searched, setSearched] = useState(false)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [kidsOnly, setKidsOnly] = useState(false)
  const { dispatch } = useStore()
  const { taste, record } = useTaste()

  /** `kids` is passed rather than read from state so the toggle can redraw with
   *  its new value immediately instead of a render behind. */
  function matching(kids: boolean): Product[] {
    const maxPrice = parseFloat(budget) || Infinity
    return products.filter((p) => {
      if (cat && p.cat !== cat) return false
      if (p.price > maxPrice) return false
      if (kids && !isKidSafe(p)) return false
      return true
    })
  }

  /**
   * `count` suggestions from the pool the filters allow.
   *
   * Randomness stays — a gift finder that returns the same three every time is
   * a search box — but taste now decides *which* random draw wins. Each
   * candidate gets its learned bonus plus a jitter wide enough that a modest
   * preference tilts the odds rather than fixing the answer, so the finder can
   * still surprise someone who has told it very little.
   *
   * `excluding` keeps what is already on screen from being drawn again. Random
   * alone would return a just-rejected item about a third of the time, which
   * reads as the thumbs-down having done nothing.
   */
  function pick(t: TasteProfile, excluding: Set<string>, count: number, kids = kidsOnly): Product[] {
    const all = matching(kids)
    let pool = all.filter((p) => !excluding.has(p.id))
    // Exhausted the filtered pool — better to repeat than to return nothing.
    if (pool.length < count) pool = all
    return pool
      .map((p) => ({ p, s: tasteBonus(t, p) + Math.random() * 7 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, count)
      .map((x) => x.p)
  }

  function findGifts() {
    setPicks(pick(taste, new Set(), 3))
    setLiked({})
    setSearched(true)
  }

  /** Toggling who it is for is a different question, not a refinement of the
   *  last answer — so it redraws rather than waiting for another Find Gifts. */
  function toggleKids() {
    const next = !kidsOnly
    setKidsOnly(next)
    if (!searched) return
    setPicks(pick(taste, new Set(), 3, next))
    setLiked({})
  }

  /** Shuffling past three suggestions is three weak "not that one"s. */
  function shuffleGifts() {
    let t = taste
    for (const p of picks) t = record(p, 'skip')
    setPicks(pick(t, new Set(picks.map((p) => p.id)), 3))
    setLiked({})
  }

  function vote(item: Product, signal: 'up' | 'down') {
    const t = record(item, signal)
    if (signal === 'up') { setLiked((m) => ({ ...m, [item.id]: true })); return }
    // Thumbs-down replaces that one card where it stands. Rebuilding the row
    // around it would move the two the visitor said nothing about, which reads
    // as the whole search having been thrown away.
    const [replacement] = pick(t, new Set(picks.map((x) => x.id)), 1)
    if (!replacement) return
    setPicks((cur) => cur.map((x) => (x.id === item.id ? replacement : x)))
  }

  function addToCart(item: Product) {
    dispatch({ type: 'ADD_TO_CART', productId: item.id, variantIndex: 0 })
    record(item, 'cart')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Gift Finder"
    >
      <div className="absolute inset-0 bg-[rgba(79,69,80,.45)]" onClick={onClose} aria-hidden="true" />
      <div className="relative w-[min(1100px,96vw)] max-h-[92vh] flex flex-col bg-[#fffaf0] border-4 border-[#ffb199] rounded-[26px] shadow-[0_8px_24px_rgba(255,138,101,.16)] p-5 sm:p-6 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-5 text-[30px] text-[#9a8fa3] cursor-pointer border-none bg-none leading-none"
          aria-label="Close Gift Finder"
        >
          ×
        </button>

        <h3 className="font-display font-extrabold text-[28px] text-[#4f4550] mb-0.5">🎁 Gift Finder</h3>
        <p className="text-[#9a8fa3] text-[14px] mb-2">Tell us what you&apos;re looking for and we&apos;ll find the perfect kawaii gift!</p>

        {/* Controls */}
        <div className="flex gap-2.5 flex-wrap items-center pb-1.5 border-b-2 border-dashed border-[#ffb199] mb-1.5">
          <div className="relative">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="appearance-none border-[2.5px] border-[#b79cff] rounded-full px-4 py-2.5 pr-9 font-display font-extrabold bg-[#e6dcff] text-[#4f4550] cursor-pointer text-[13.5px] focus:outline-none min-w-[180px]"
              aria-label="Filter by type"
            >
              <option value="">Any type</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.emoji} {c.name}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#b79cff] font-black">▾</span>
          </div>
          <div className="relative">
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="appearance-none border-[2.5px] border-[#b79cff] rounded-full px-4 py-2.5 pr-9 font-display font-extrabold bg-[#e6dcff] text-[#4f4550] cursor-pointer text-[13.5px] focus:outline-none"
              aria-label="Filter by budget"
            >
              <option value="">Any budget</option>
              <option value="15">Under $15</option>
              <option value="30">Under $30</option>
              <option value="60">Under $60</option>
              <option value="100">Under $100</option>
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#b79cff] font-black">▾</span>
          </div>
          <button
            onClick={toggleKids}
            aria-pressed={kidsOnly}
            title="Show only things suitable as a gift for a child"
            className={`border-[2.5px] font-display font-extrabold px-4 py-2.5 rounded-full cursor-pointer text-[13.5px] transition-colors
              ${kidsOnly
                ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
                : 'border-[#b79cff] bg-white text-[#4f4550] hover:bg-[#e6dcff]'}`}
          >
            🧸 For a kid{kidsOnly ? ' ✓' : ''}
          </button>
          <button
            onClick={findGifts}
            className="border-[3px] border-[#ff8a65] bg-[#ff8a65] text-white font-display font-extrabold px-5 py-2.5 rounded-full cursor-pointer text-[15px] hover:opacity-90 transition-opacity active:translate-y-0.5"
          >
            ✨ Find Gifts!
          </button>
          {searched && (
            <button
              onClick={shuffleGifts}
              className="border-[2.5px] border-[#b79cff] bg-[#e6dcff] text-[#4f4550] font-display font-extrabold px-4 py-2 rounded-full cursor-pointer text-[13px]"
            >
              🔀 Shuffle
            </button>
          )}
        </div>

        {/* What the finder has picked up so far. The prompt only appears once
            someone has actually shown friction — asking for feedback before
            they have rejected anything is noise. */}
        {searched && (shouldNudge(taste) || isLearning(taste)) && (
          <div className="mt-1.5 text-[12px] font-bold leading-snug rounded-[14px] px-3 py-2 border-2 border-dashed border-[#6495ED] bg-[rgba(100,149,237,.08)] text-[#4a6fb5]">
            {shouldNudge(taste) ? (
              <>Don&apos;t quite see what you&apos;re looking for? Keep telling us what you like and what you don&apos;t with 👍 and 👎, and we&apos;ll help you find the perfect gift.</>
            ) : (
              <>Learning what you like 🎀 — keep using 👍 and 👎 and these picks get sharper.</>
            )}
          </div>
        )}

        <TasteNote variant="panel" />

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          {!searched && (
            <div className="flex items-center justify-center h-40 text-[#9a8fa3] font-bold text-center">
              <div>
                <div className="text-5xl mb-3">🎁</div>
                <p>Pick a type and budget above, then hit Find Gifts!</p>
              </div>
            </div>
          )}

          {searched && picks.length === 0 && (
            <div className="flex items-center justify-center h-40 text-[#9a8fa3] font-bold text-center">
              <p>
                No matches for that combo yet — try loosening a filter
                {kidsOnly ? ', or turn off “For a kid”' : ''}. 🌸
              </p>
            </div>
          )}

          {picks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {picks.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col bg-white border-[3px] border-[#ffb199] rounded-[20px] overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,138,101,.16)]"
                >
                  <div className="relative flex-1 min-h-[160px] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea] flex items-center justify-center text-[64px] overflow-hidden">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      : <span aria-hidden="true">{catEmoji(p.cat)}</span>
                    }
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => vote(p, 'up')}
                        className={`w-[32px] h-[32px] rounded-full border-2 text-[15px] leading-none flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(79,69,80,.28)] transition-colors
                          ${liked[p.id] ? 'border-[#2e7d32] bg-[#c9ecd2]' : 'border-white bg-[rgba(255,255,255,.92)] hover:bg-white'}`}
                        aria-label={`More like ${p.name}`}
                        title="More like this"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        onClick={() => vote(p, 'down')}
                        className="w-[32px] h-[32px] rounded-full border-2 border-white bg-[rgba(255,255,255,.92)] text-[15px] leading-none flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(79,69,80,.28)] hover:bg-white transition-colors"
                        aria-label={`Fewer like ${p.name}`}
                        title="Not this — show me something else"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                  <div className="p-3 px-3.5 pb-3.5">
                    <div className="font-bold text-[14px] leading-tight line-clamp-2 mb-1">{p.name}</div>
                    <div className="font-display text-[#ff8a65] text-[18px] mb-2">{money(p.price)}</div>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      className="block w-full border-[2.5px] border-[#ff8a65] bg-[#ffb199] rounded-xl font-display font-extrabold text-[13px] py-2.5 text-center cursor-pointer text-[#4f4550] hover:bg-[#ff8a65] hover:text-white transition-colors active:translate-y-0.5"
                      aria-label={`Add ${p.name} to cart`}
                    >
                      Add to Cart 🎀
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
