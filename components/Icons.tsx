/**
 * The header's UI icons, drawn rather than borrowed from the emoji font.
 *
 * Same reasoning as components/BrandMark.tsx: 🛍️ 🎁 ❤️ 🛒 🔍 render as
 * whatever each visitor's OS draws, in that OS's palette, at that OS's weight.
 * Sitting beside a hand-drawn brand mark they read as a different design
 * system — Apple's glossy gradients on one machine, Google's flat primaries on
 * another, Microsoft's outlines on a third.
 *
 * All stroke-based on `currentColor`, deliberately: the wishlist button is
 * pink, the cart button is plum, and both change on hover. Inheriting the text
 * colour means one icon works everywhere and nothing has to be re-themed by
 * hand. The pink accents that ARE hardcoded are the ones that should stay pink
 * whatever the button does — the heart in the shop bag, the gift bow.
 *
 * 24x24 viewBox, 2.2 stroke, round caps and joins, to match the soft geometry
 * of the brand mark rather than a sharp utility icon set.
 */

type IconProps = { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
  focusable: 'false' as const,
  style: { display: 'inline-block', verticalAlign: '-0.22em', flexShrink: 0 },
})

export function SearchIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10.5" cy="10.5" r="6.8" />
      <path d="M15.6 15.6 L21 21" />
    </svg>
  )
}

export function ShopIcon({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4.6 7.5h14.8l-1.2 12.1a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8Z" />
      <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
      {/* stays pink whatever the button is doing */}
      <path
        d="M12 12.4c-1-1.2-2.7-.6-2.7.8 0 1.1 1.7 2 2.7 2.8 1-.8 2.7-1.7 2.7-2.8 0-1.4-1.7-2-2.7-.8z"
        fill="#ff2e74" stroke="none"
      />
    </svg>
  )
}

export function GiftIcon({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.6 11.4h16.8v8.4a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z" />
      <path d="M2.6 7.6h18.8v3.8H2.6Z" />
      <path d="M12 7.6v13.8" />
      <path d="M12 7.6C10.4 4.4 6.2 4.6 6.9 7c.4 1.3 3.2 1 5.1.6zM12 7.6c1.6-3.2 5.8-3 5.1-.6-.4 1.3-3.2 1-5.1.6z"
        fill="#ff2e74" stroke="#ff2e74" strokeWidth="1.4" />
    </svg>
  )
}

export function HeartIcon({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 20.6C6.9 17.2 3.4 14.4 3.4 10.5A4.4 4.4 0 0 1 12 8.4a4.4 4.4 0 0 1 8.6 2.1c0 3.9-3.5 6.7-8.6 10.1Z" fill="currentColor" />
    </svg>
  )
}

export function CartIcon({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.6 3.4h2.6l2.3 11.1a1.8 1.8 0 0 0 1.8 1.4h8.2a1.8 1.8 0 0 0 1.8-1.4l1.4-6.8H6.1" />
      <circle cx="10" cy="20" r="1.7" fill="#ff2e74" stroke="none" />
      <circle cx="18" cy="20" r="1.7" fill="#ff2e74" stroke="none" />
    </svg>
  )
}
