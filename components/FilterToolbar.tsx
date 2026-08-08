'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORIES, PRICE_BUCKETS, catName, newItemCutoff, type Product } from '@/lib/data'

export type Filters = {
  store: string
  cat: string
  priceBucket: string
  onSaleOnly: boolean
  newOnly: boolean
}

type Props = {
  filters: Filters
  products: Product[]
  onChange: (f: Filters) => void
}

export default function FilterToolbar({ filters, products, onChange }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const gridProds = products

  // Count helpers
  const storeCounts: Record<string, number> = {}
  gridProds.forEach((p) => { storeCounts[p.vendor] = (storeCounts[p.vendor] || 0) + 1 })

  const catCounts: Record<string, number> = {}
  gridProds.forEach((p) => {
    if (filters.store && p.vendor !== filters.store) return
    if (catCounts[p.cat] === undefined) catCounts[p.cat] = 0
    catCounts[p.cat]++
  })

  const pbCounts: Record<string, number> = {}
  PRICE_BUCKETS.forEach((b) => {
    pbCounts[b.key] = gridProds.filter((p) => {
      if (filters.store && p.vendor !== filters.store) return false
      if (filters.cat && p.cat !== filters.cat) return false
      return p.price >= b.min && p.price < b.max
    }).length
  })

  const onSaleCount = gridProds.filter((p) => {
    if (filters.store && p.vendor !== filters.store) return false
    if (filters.cat && p.cat !== filters.cat) return false
    return p.onSale
  }).length

  const newCount = gridProds.filter((p) => {
    if (filters.store && p.vendor !== filters.store) return false
    if (filters.cat && p.cat !== filters.cat) return false
    // Shared, day-snapped cutoff — this count is rendered, so it has to match
    // between the prerender and the client. See newItemCutoff().
    return p.added && new Date(p.added).getTime() >= newItemCutoff()
  }).length

  const activeDeals = (filters.priceBucket ? 1 : 0) + (filters.onSaleOnly ? 1 : 0) + (filters.newOnly ? 1 : 0)

  function setF(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial })
  }

  // Close popover on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
          toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggleGroup(group: string) {
    setOpenGroup((prev) => (prev === group ? null : group))
  }

  const popoverContent = () => {
    if (!openGroup) return null
    if (openGroup === 'store') {
      const stores = Object.keys(storeCounts).sort()
      return (
        <div>
          <div className="font-display font-extrabold text-[12px] uppercase tracking-[.6px] text-[#9a8fa3] mb-2.5 text-center">🏪 Shop by Store</div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Pill label="All Stores" count={gridProds.length} isOn={!filters.store} color="#6bc98a" onClick={() => setF({ store: '' })} />
            {stores.map((s) => (
              <Pill key={s} label={s} count={storeCounts[s]} isOn={filters.store === s} color="#6bc98a" onClick={() => setF({ store: filters.store === s ? '' : s })} />
            ))}
          </div>
        </div>
      )
    }
    if (openGroup === 'deals') {
      return (
        <div>
          <div className="font-display font-extrabold text-[12px] uppercase tracking-[.6px] text-[#9a8fa3] mb-2.5 text-center">💰 Price &amp; Deals</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {PRICE_BUCKETS.map((b) => (
              <Pill key={b.key} label={b.label} count={pbCounts[b.key] ?? 0} isOn={filters.priceBucket === b.key} color="#ff8a65" onClick={() => setF({ priceBucket: filters.priceBucket === b.key ? '' : b.key })} />
            ))}
            <Pill label="🔥 On Sale" count={onSaleCount} isOn={filters.onSaleOnly} color="#ff8a65" onClick={() => setF({ onSaleOnly: !filters.onSaleOnly })} />
            <Pill label="🆕 New This Week" count={newCount} isOn={filters.newOnly} color="#ff8a65" onClick={() => setF({ newOnly: !filters.newOnly })} />
          </div>
        </div>
      )
    }
    if (openGroup === 'type') {
      return (
        <div>
          <div className="font-display font-extrabold text-[12px] uppercase tracking-[.6px] text-[#9a8fa3] mb-2.5 text-center">🧸 Shop by Type</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((c) => {
              const n = catCounts[c.key] ?? 0
              return (
                <Pill
                  key={c.key}
                  label={c.name}
                  count={n}
                  isOn={filters.cat === c.key}
                  color="#ff8a65"
                  onClick={n === 0 ? undefined : () => setF({ cat: filters.cat === c.key ? '' : c.key })}
                  zero={n === 0}
                />
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-[rgba(255,250,240,.94)] py-3.5 border-b-[3px] border-[#ffb199]">
      <div className="relative max-w-[1180px] mx-auto px-4">
        <div ref={toolbarRef} className="flex justify-center items-center flex-wrap gap-2.5">
          <TBtn
            id="tbtn-store"
            label={filters.store || 'All Stores'}
            isActive={!!filters.store}
            isOpen={openGroup === 'store'}
            colorClass="border-[#6bc98a] [&.active]:bg-[#6bc98a] [&.active]:border-[#6bc98a]"
            onClick={() => toggleGroup('store')}
          />
          <TBtn
            id="tbtn-deals"
            label={activeDeals ? `${activeDeals} active` : 'Price & Deals'}
            isActive={activeDeals > 0}
            isOpen={openGroup === 'deals'}
            colorClass="border-[#f5b942] [&.active]:bg-[#f5b942] [&.active]:border-[#f5b942]"
            onClick={() => toggleGroup('deals')}
          />
          <TBtn
            id="tbtn-type"
            label={filters.cat ? catName(filters.cat) : 'Type'}
            isActive={!!filters.cat}
            isOpen={openGroup === 'type'}
            colorClass="border-[#ff8a65] [&.active]:bg-[#ff8a65] [&.active]:border-[#ff8a65]"
            onClick={() => toggleGroup('type')}
          />
          {(filters.store || filters.cat || filters.priceBucket || filters.onSaleOnly || filters.newOnly) && (
            <button
              onClick={() => { onChange({ store: '', cat: '', priceBucket: '', onSaleOnly: false, newOnly: false }); setOpenGroup(null) }}
              className="font-extrabold text-[12px] bg-white border-[2.5px] border-[#ffb199] px-4 py-1.5 rounded-full cursor-pointer text-[#9a8fa3] hover:text-[#ff8a65] hover:border-[#ff8a65]"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Popover */}
        {openGroup && (
          <div
            ref={popRef}
            className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-35 bg-white border-[3px] border-[#ffb199] rounded-[18px] px-4 py-3.5 shadow-[0_8px_24px_rgba(255,138,101,.16)] min-w-[280px] max-w-[min(640px,92vw)]"
          >
            {popoverContent()}
            <div className="flex justify-center mt-2.5">
              <button
                onClick={() => setOpenGroup(null)}
                className="font-extrabold text-[12px] bg-white border-[2.5px] border-[#ffb199] px-4 py-1.5 rounded-full cursor-pointer text-[#9a8fa3] hover:text-[#ff8a65] hover:border-[#ff8a65]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TBtn({ id, label, isActive, isOpen, colorClass, onClick }: { id: string; label: string; isActive: boolean; isOpen: boolean; colorClass: string; onClick: () => void }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 border-[2.5px] bg-white rounded-full px-4 py-[9px] font-display font-bold text-[13.5px] text-[#4f4550] cursor-pointer whitespace-nowrap transition-all
        hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,138,101,.18)]
        ${isOpen ? 'shadow-[0_0_0_3px_rgba(255,138,101,.3)]' : ''}
        ${isActive ? 'text-white' : ''}
        ${colorClass}
        ${isActive ? 'active' : ''}`}
      aria-expanded={isOpen}
    >
      <span className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      <span className="text-[10px] opacity-70">{isOpen ? '▴' : '▾'}</span>
    </button>
  )
}

function Pill({
  label, count, isOn, color, onClick, zero
}: { label: string; count: number; isOn: boolean; color: string; onClick?: () => void; zero?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={zero}
      className={`border-2 font-bold text-[12.5px] px-3 py-[7px] rounded-full cursor-pointer text-[#4f4550] whitespace-nowrap bg-[#fffaf0] inline-flex items-center justify-center gap-1.5 leading-none transition-colors
        ${zero ? 'opacity-30 grayscale-[.5] cursor-default' : ''}
        ${isOn ? 'text-white' : ''}`}
      style={{
        borderColor: color,
        background: isOn ? color : undefined,
        color: isOn ? '#fff' : undefined,
      }}
    >
      {label}
      <span
        className={`text-[9.5px] rounded-full px-1.5 py-0.5 inline-flex items-center justify-center ${isOn ? 'bg-[rgba(255,255,255,.3)] opacity-90' : 'bg-[rgba(0,0,0,.06)] opacity-60'}`}
      >
        {count}
      </span>
    </button>
  )
}
