'use client'
import { useState, useRef, useEffect } from 'react'
import { useStore, cartCount } from '@/lib/store'
import { CatMark, PandaMark } from '@/components/BrandMark'
import { CartIcon, GiftIcon, HeartIcon, SearchIcon, ShopIcon } from '@/components/Icons'

type HeaderProps = {
  onSearch: (q: string) => void
  onOpenCart: () => void
  onOpenWish: () => void
  onOpenGift: () => void
  wishCount: number
  searchValue: string
  }
  
  export default function Header({ onSearch, onOpenCart, onOpenWish, onOpenGift, wishCount, searchValue }: HeaderProps) {
  const { state } = useStore()
  const count = cartCount(state.cart)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSearch(e.target.value)
  }
  function clearSearch() {
    onSearch('')
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.focus()
  }

  // Sync external value changes
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== searchValue) {
      inputRef.current.value = searchValue
    }
  }, [searchValue])

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[rgba(79,69,80,.45)] z-[65]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {/* Mobile slide menu */}
      <nav
        className="fixed top-0 left-0 w-[min(280px,84vw)] h-full bg-white z-[70] shadow-[0_8px_24px_rgba(255,138,101,.16)] flex flex-col p-5 transition-transform duration-200"
        style={{ transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex justify-between items-center mb-5">
          <span className="font-display font-extrabold text-lg text-[#4f4550] inline-flex items-center gap-2"><CatMark size={26} /> Kawaii Katz</span>
          <button onClick={() => setMobileMenuOpen(false)} className="text-2xl text-[#9a8fa3]" aria-label="Close menu">×</button>
        </div>
        <a href="#shop" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 px-2 font-display font-bold text-base border-b border-[#ffe6d9] text-[#4f4550]"><ShopIcon size={18} /> Shop</a>
        <button onClick={() => { setMobileMenuOpen(false); onOpenGift() }} className="flex items-center gap-2 text-left py-3 px-2 font-display font-bold text-base border-b border-[#ffe6d9] text-[#4f4550] w-full"><GiftIcon size={18} /> Gift Finder</button>
        <a href="/gifts" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-3 px-2 font-display font-bold text-base border-b border-[#ffe6d9] text-[#4f4550]">🎁 Gift Guides</a>
        <button onClick={() => { setMobileMenuOpen(false); onOpenWish() }} className="block text-left py-3 px-2 font-display font-bold text-base border-b border-[#ffe6d9] text-[#4f4550] w-full">
          <span className="inline-flex items-center gap-2"><HeartIcon size={18} /> My Board</span> {wishCount > 0 && <span className="ml-1 bg-[#ff5a7a] text-white rounded-full text-xs px-2 py-0.5">{wishCount}</span>}
        </button>
      </nav>

      <header className="sticky top-0 z-40 bg-[rgba(255,255,255,.88)] backdrop-blur-[8px] border-b-[3px] border-[#ffb199]">
        <div className="flex items-center gap-3.5 px-4 py-3 max-w-[1180px] mx-auto flex-wrap">
          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden border-[2.5px] border-[#ff8a65] bg-white rounded-xl w-10 h-10 flex flex-col items-center justify-center gap-1"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span className="block w-5 h-[2.5px] bg-[#ff8a65] rounded" />
            <span className="block w-5 h-[2.5px] bg-[#ff8a65] rounded" />
            <span className="block w-5 h-[2.5px] bg-[#ff8a65] rounded" />
          </button>

          {/* Logo */}
          <a
            href="/"
            className="font-display font-extrabold text-[22px] text-[#4f4550] whitespace-nowrap bg-gradient-to-r from-[#ffb199] to-[#bfe3ea] px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(255,138,101,.18)] flex flex-col items-center justify-center leading-none"
          >
            <span className="flex items-center gap-2"><CatMark size={28} /> Kawaii Katz <PandaMark size={28} /></span>
            <small className="font-sans text-[9.5px] leading-none mt-[1px] tracking-[1.1px] font-extrabold uppercase text-[#4f4550] opacity-70 text-center">
              Kawaii, Clever &amp; Kind
            </small>
          </a>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px] order-3 sm:order-none">
            <input
              ref={inputRef}
              type="search"
              defaultValue={searchValue}
              placeholder="Search plushies, puzzles, wooden toys…"
              autoComplete="off"
              onChange={handleSearchChange}
              className="w-full border-[3px] border-[#ffb199] bg-white rounded-full px-[18px] py-[11px] pr-11 font-sans font-semibold text-[#4f4550] outline-none shadow-[0_4px_12px_rgba(255,138,101,.18)] focus:border-[#7fc4d4]"
              aria-label="Search products"
            />
            {searchValue ? (
              <button
                onClick={clearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xl text-[#9a8fa3] border-none bg-none"
                aria-label="Clear search"
              >×</button>
            ) : (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#c4bccb] pointer-events-none"><SearchIcon /></span>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-1 flex-wrap" aria-label="Main navigation">
            <a href="#shop" className="font-bold text-[13.5px] px-3 py-2 rounded-full hover:bg-[#ffb199] transition-colors inline-flex items-center gap-1.5"><ShopIcon /> Shop</a>
            <button onClick={onOpenGift} className="font-bold text-[13.5px] px-3 py-2 rounded-full hover:bg-[#ffb199] transition-colors cursor-pointer inline-flex items-center gap-1.5"><GiftIcon /> Gift Finder</button>
            <a href="/gifts" className="font-bold text-[13.5px] px-3 py-2 rounded-full hover:bg-[#ffb199] transition-colors inline-flex items-center gap-1.5">🎁 Gift Guides</a>
          </nav>

          {/* Wishlist button */}
          <button
            onClick={onOpenWish}
            className="relative border-[3px] border-[#ff5a7a] bg-white text-[#ff5a7a] font-extrabold px-3.5 py-[9px] rounded-full cursor-pointer text-sm shadow-[0_4px_12px_rgba(255,138,101,.18)] font-display"
            aria-label={`Wishlist, ${wishCount} items`}
          >
            <span className="inline-flex items-center gap-1.5"><HeartIcon /> Board</span>
            {wishCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#ff5a7a] text-white border-2 border-white rounded-full min-w-[22px] h-[22px] text-xs flex items-center justify-center px-1">
                {wishCount}
              </span>
            )}
          </button>

          {/* Cart button */}
          <button
            onClick={onOpenCart}
            className="relative border-[3px] border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-extrabold px-4 py-[9px] rounded-full cursor-pointer text-sm shadow-[0_4px_12px_rgba(255,138,101,.18)] font-display"
            aria-label={`Cart, ${count} items`}
          >
            <span className="inline-flex items-center gap-1.5"><CartIcon /> Cart</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#7fc4d4] text-white border-2 border-white rounded-full min-w-[22px] h-[22px] text-xs flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile bottom bar */}
      <div className="sm:hidden fixed left-0 right-0 bottom-0 z-45 bg-white border-t-[3px] border-[#ffb199] px-2.5 py-2 flex gap-2 shadow-[0_-6px_16px_rgba(0,0,0,.10)]">
        <button
          onClick={onOpenCart}
          className="relative flex-1 border-[2.5px] border-[#ff8a65] bg-[#ffb199] rounded-full font-display font-extrabold py-2.5 text-[13.5px] text-[#4f4550] flex items-center justify-center gap-1.5"
        >
          <span className="inline-flex items-center gap-1.5"><CartIcon /> Cart</span>
          {count > 0 && (
            <span className="absolute -top-1.5 right-2.5 bg-[#7fc4d4] text-white border-2 border-white rounded-full min-w-[19px] h-[19px] text-[11px] flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </button>
        <button
          onClick={onOpenWish}
          className="relative flex-1 border-[2.5px] border-[#7fc4d4] bg-white rounded-full font-display font-extrabold py-2.5 text-[13.5px] text-[#7fc4d4] flex items-center justify-center gap-1.5"
        >
          <span className="inline-flex items-center gap-1.5"><HeartIcon /> Board</span>
          {wishCount > 0 && (
            <span className="absolute -top-1.5 right-2.5 bg-[#ff5a7a] text-white border-2 border-white rounded-full min-w-[19px] h-[19px] text-[11px] flex items-center justify-center px-1">
              {wishCount}
            </span>
          )}
        </button>
      </div>
    </>
  )
}
