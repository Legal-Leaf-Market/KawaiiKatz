'use client'
import { useStore } from '@/lib/store'
import { catEmoji, money, type Product } from '@/lib/data'
import { pinProductPage } from '@/lib/pinterest'

type Props = {
  open: boolean
  onClose: () => void
  products: Product[]
}

export default function WishlistDrawer({ open, onClose, products }: Props) {
  const { state, dispatch } = useStore()
  const { wish } = state
  const wishProducts = wish.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]

  function removeWish(id: string) {
    dispatch({ type: 'TOGGLE_WISH', productId: id })
  }
  function addToCart(id: string) {
    dispatch({ type: 'ADD_TO_CART', productId: id, variantIndex: 0 })
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-[rgba(79,69,80,.4)] z-50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 w-[min(430px,92vw)] h-full bg-[#fffaf0] border-l-4 border-[#ff9ecb] z-60 flex flex-col transition-transform duration-[220ms] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="My wishlist board"
      >
        <div className="flex items-center justify-between p-4 border-b-[3px] border-[#ff9ecb]">
          <h2 className="font-display font-extrabold text-[20px] text-[#4f4550]">
            ❤️ My Board
            {wish.length > 0 && (
              <span className="font-sans text-[12px] font-extrabold bg-[#ff5a7a] text-white rounded-full px-2.5 py-[2px] ml-1.5 align-middle">
                {wish.length}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="border-none bg-none text-[26px] cursor-pointer text-[#9a8fa3] leading-none" aria-label="Close wishlist">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 px-4">
          {wish.length === 0 && (
            <div className="text-center text-[#9a8fa3] py-12 font-semibold">
              <div className="text-5xl mb-3">❤️</div>
              <p>Your board is empty!</p>
              <p className="text-sm mt-1">Tap the ♡ heart on any product to save it.</p>
            </div>
          )}
          <p className="text-[#9a8fa3] font-semibold text-[12px] mb-3">Tap a heart again to remove. These are saved in your browser.</p>
          <div className="columns-2 gap-3">
            {wishProducts.map((p) => (
              <div
                key={p.id}
                className="break-inside-avoid inline-block w-full mb-3 bg-white border-[3px] border-[#ff9ecb] rounded-[20px] overflow-hidden shadow-[0_4px_12px_rgba(255,138,101,.18)] relative"
              >
                <button
                  onClick={() => removeWish(p.id)}
                  className="absolute top-2 right-2 border-2 border-[#ff5a7a] bg-white text-[#ff5a7a] rounded-full w-[28px] h-[28px] cursor-pointer text-sm z-20 flex items-center justify-center hover:bg-[#ff5a7a] hover:text-white transition-colors"
                  aria-label={`Remove ${p.name} from wishlist`}
                >
                  ×
                </button>
                <div className="w-full bg-gradient-to-br from-[#ffd6e7] to-[#bfe3ea] flex items-center justify-center text-[52px] min-h-[120px]">
                  {p.image
                    ? <img src={p.image} alt={p.name} className="w-full block" />
                    : <span aria-hidden="true">{catEmoji(p.cat)}</span>
                  }
                </div>
                <div className="p-2.5 px-3 flex flex-col gap-1.5">
                  <div className="text-[9.5px] font-extrabold uppercase tracking-[.6px] text-[#b79cff]">{p.vendor}</div>
                  <div className="font-display font-extrabold text-[13.5px] leading-tight">{p.name}</div>
                  <div className="font-display text-[#ff8a65] text-[15px]">{money(p.price)}</div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => addToCart(p.id)}
                      className="flex-1 border-2 border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold rounded-[10px] py-1.5 cursor-pointer text-xs text-center hover:bg-[#ff8a65] hover:text-white transition-colors"
                      aria-label={`Add ${p.name} to cart`}
                    >
                      Add 🛒
                    </button>
                    <button
                      onClick={() => pinProductPage(p)}
                      className="flex-none border-2 border-[#e60023] bg-white text-[#e60023] rounded-[10px] w-8 cursor-pointer text-[13px] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
                      aria-label={`Pin ${p.name} to Pinterest`}
                      title="Save to Pinterest"
                    >
                      📌
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
