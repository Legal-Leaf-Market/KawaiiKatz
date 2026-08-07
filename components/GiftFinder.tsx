'use client'
import { useState } from 'react'
import { CATEGORIES, catEmoji, money, type Product } from '@/lib/data'
import { useStore } from '@/lib/store'

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
  const { dispatch } = useStore()

  function findGifts() {
    const maxPrice = parseFloat(budget) || Infinity
    const pool = products.filter((p) => {
      if (cat && p.cat !== cat) return false
      if (p.price > maxPrice) return false
      return true
    })
    // Fisher-Yates shuffle
    const arr = [...pool]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setPicks(arr.slice(0, 3))
    setSearched(true)
  }

  function addToCart(id: string) {
    dispatch({ type: 'ADD_TO_CART', productId: id, variantIndex: 0 })
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
            onClick={findGifts}
            className="border-[3px] border-[#ff8a65] bg-[#ff8a65] text-white font-display font-extrabold px-5 py-2.5 rounded-full cursor-pointer text-[15px] hover:opacity-90 transition-opacity active:translate-y-0.5"
          >
            ✨ Find Gifts!
          </button>
          {searched && (
            <button
              onClick={findGifts}
              className="border-[2.5px] border-[#b79cff] bg-[#e6dcff] text-[#4f4550] font-display font-extrabold px-4 py-2 rounded-full cursor-pointer text-[13px]"
            >
              🔀 Shuffle
            </button>
          )}
        </div>

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
              <p>No matches for that combo yet — try loosening a filter. 🌸</p>
            </div>
          )}

          {picks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {picks.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col bg-white border-[3px] border-[#ffb199] rounded-[20px] overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,138,101,.16)]"
                >
                  <div className="flex-1 min-h-[160px] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea] flex items-center justify-center text-[64px] overflow-hidden">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      : <span aria-hidden="true">{catEmoji(p.cat)}</span>
                    }
                  </div>
                  <div className="p-3 px-3.5 pb-3.5">
                    <div className="font-bold text-[14px] leading-tight line-clamp-2 mb-1">{p.name}</div>
                    <div className="font-display text-[#ff8a65] text-[18px] mb-2">{money(p.price)}</div>
                    <button
                      type="button"
                      onClick={() => addToCart(p.id)}
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
