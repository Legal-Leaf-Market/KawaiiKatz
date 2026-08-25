'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useExclusions } from '@/hooks/useExclusions'
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
 * The interactive half of a gift guide.
 *
 * The sections themselves are chosen on the server (see lib/boards.ts) so the
 * page prerenders with real products in the HTML — a Pinterest scraper, a
 * search crawler and a visitor on a slow phone all get the guide, not a
 * spinner. This component only adds what needs a browser.
 *
 * It filters the curator's exclusion list client-side, the way the home grid
 * does. The guide is cached for six hours; an exclusion is meant to take effect
 * now. Reading the list on the server would either serve a hidden product for
 * up to six hours or make the page dynamic and lose the cache entirely, so it
 * is read here instead and the tile disappears on hydration.
 */
export default function BoardGrid({ slug, title, tagline, hashtag, sections }: Props) {
  const { state, dispatch } = useStore()
  const { excludedIds } = useExclusions()
  const [added, setAdded] = useState<string | null>(null)

  const visible = useMemo(
    () =>
      sections
        .map((s) => ({ ...s, products: s.products.filter((p) => !excludedIds.has(p.id)) }))
        .filter((s) => s.products.length > 0),
    [sections, excludedIds]
  )

  const cover = visible[0]?.products[0]

  function addToCart(p: Product) {
    dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex: 0 })
    setAdded(p.id)
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1600)
  }

  return (
    <>
      {cover && (
        <div className="flex flex-wrap gap-2 mb-7">
          <button
            type="button"
            onClick={() => pinGuide({ slug, title, tagline, tag: hashtag, cover })}
            className="border-[3px] border-[#e60023] bg-[#e60023] text-white font-display font-extrabold px-4 py-2.5 rounded-full cursor-pointer text-[14px] hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            title="Pin this whole guide to one of your boards"
          >
            📌 Pin this guide
          </button>
          <button
            type="button"
            onClick={() => {
              track({ event_name: 'view_category', custom_data: { product_category: slug } })
              document.getElementById(visible[0].key)?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="border-[3px] border-[#7fc4d4] bg-white text-[#4f4550] font-display font-extrabold px-4 py-2.5 rounded-full cursor-pointer text-[14px] hover:bg-[#bfe3ea] transition-colors"
          >
            Start browsing ↓
          </button>
        </div>
      )}

      {visible.map((s) => (
        <section key={s.key} id={s.key} className="mb-10 scroll-mt-24">
          <h2 className="font-display font-extrabold text-[22px] sm:text-[26px] text-[#4f4550] leading-tight">
            {s.title}
          </h2>
          <p className="text-[14px] text-[#9a8fa3] font-semibold mt-0.5 mb-4 max-w-[62ch]">{s.blurb}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {s.products.map((p) => {
              const inWish = state.wish.includes(p.id)
              return (
                <div
                  key={p.id}
                  className="bg-white border-[3px] border-[#ffb199] rounded-[20px] overflow-hidden shadow-[0_4px_12px_rgba(255,138,101,.18)] flex flex-col"
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
                    <div className="text-[10px] font-extrabold uppercase tracking-[.6px] text-[#b79cff] truncate">
                      {p.vendor}
                    </div>
                    <Link
                      href={`/p/${p.id}`}
                      className="font-display font-extrabold text-[13.5px] leading-tight line-clamp-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className={`font-display text-[17px] ${p.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
                      {p.unit && <span className="text-[12px] font-bold mr-1">{p.unit}</span>}
                      {money(p.price)}
                    </div>

                    <div className="flex gap-1.5 mt-auto pt-1">
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        className={`flex-1 border-2 font-display font-extrabold rounded-xl py-2 cursor-pointer text-[12.5px] transition-colors
                          ${added === p.id
                            ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]'
                            : 'border-[#ff8a65] bg-[#ffb199] text-[#4f4550] hover:bg-[#ff8a65] hover:text-white'}`}
                      >
                        {added === p.id ? 'Added ✓' : 'Add 🎀'}
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'TOGGLE_WISH', productId: p.id })}
                        className={`flex-none border-2 border-[#ff5a7a] ${inWish ? 'bg-[#ff5a7a] text-white' : 'bg-white text-[#ff5a7a]'} rounded-xl w-9 cursor-pointer text-[15px] flex items-center justify-center`}
                        aria-label={inWish ? 'Remove from My Board' : 'Save to My Board'}
                      >
                        {inWish ? '♥' : '♡'}
                      </button>
                      {/* Pins our own /p/<id>, carrying this guide's season tag
                          rather than the month-based one. See pinProductPage(). */}
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
        </section>
      ))}
    </>
  )
}
