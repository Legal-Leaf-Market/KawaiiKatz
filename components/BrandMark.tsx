/**
 * The cat and the panda, as inline SVG.
 *
 * The header, the mobile menu and the footer all used the raw emoji 🐈‍⬛ and
 * 🐼, which means each visitor saw whatever their OS emoji font draws. On most
 * platforms 🐈‍⬛ is not black — it renders periwinkle-blue — so the brand
 * lockup sat next to a plum-and-pink favicon showing a purple cat and a grey
 * panda. Two different animals, in two different palettes, for the same brand.
 *
 * These are the same shapes as assets/icon.svg, redrawn head-only at a 100x100
 * viewBox so they scale cleanly next to text. Inline rather than <img> so they
 * inherit no extra request, stay crisp at any size, and can be recoloured from
 * CSS later if that is ever wanted.
 *
 * Decorative: the adjacent text already says "Kawaii Katz", so both are
 * aria-hidden. That is also a small accessibility win — a screen reader used to
 * announce "cat Kawaii Katz panda".
 *
 * If the icon artwork changes, change it here too. They are deliberately two
 * files: assets/*.svg are rendered to PNG by scripts/mkicons.mjs and never
 * imported at runtime, while these ship in the bundle.
 */

type MarkProps = { size?: number; className?: string }

export function CatMark({ size = 26, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} className={className}
      aria-hidden="true" focusable="false" style={{ display: 'inline-block', verticalAlign: '-0.18em' }}
    >
      <g fill="#2e2338" stroke="#2e2338" strokeWidth="8" strokeLinejoin="round">
        <path d="M24 40 L27 15 L48 27 Z" /><path d="M76 40 L73 15 L52 27 Z" />
      </g>
      <path d="M30 36 L32 22 L42 28 Z" fill="#ff85ad" />
      <path d="M70 36 L68 22 L58 28 Z" fill="#ff85ad" />
      <ellipse cx="50" cy="59" rx="39" ry="35" fill="#2e2338" />
      <path d="M31 59 Q39 48 47 59" fill="none" stroke="#fffaf0" strokeWidth="6" strokeLinecap="round" />
      <path d="M53 59 Q61 48 69 59" fill="none" stroke="#fffaf0" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="16" cy="70" rx="9" ry="5.5" fill="#ff6b9d" />
      <ellipse cx="84" cy="70" rx="9" ry="5.5" fill="#ff6b9d" />
      <path d="M50 70 c-3.2-4 -8.5-2 -8.5 2.3 c0 3.5 5.2 6 8.5 8.5 c3.3-2.5 8.5-5 8.5-8.5 c0-4.3 -5.3-6.3 -8.5-2.3z" fill="#ff2e74" />
    </svg>
  )
}

export function PandaMark({ size = 26, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} className={className}
      aria-hidden="true" focusable="false" style={{ display: 'inline-block', verticalAlign: '-0.18em' }}
    >
      <circle cx="25" cy="21" r="14" fill="#2e2338" /><circle cx="75" cy="21" r="14" fill="#2e2338" />
      <circle cx="50" cy="57" r="36" fill="#fffaf0" stroke="#2e2338" strokeWidth="6" />
      <ellipse cx="36" cy="53" rx="11.5" ry="13.5" fill="#2e2338" />
      <ellipse cx="64" cy="53" rx="11.5" ry="13.5" fill="#2e2338" />
      <circle cx="33.5" cy="49.5" r="4.2" fill="#fffaf0" /><circle cx="61.5" cy="49.5" r="4.2" fill="#fffaf0" />
      <ellipse cx="19" cy="66" rx="7.5" ry="4.6" fill="#ff6b9d" />
      <ellipse cx="81" cy="66" rx="7.5" ry="4.6" fill="#ff6b9d" />
      <path d="M50 68 c-2.8-3.5 -7.4-1.7 -7.4 2 c0 3 4.5 5.2 7.4 7.4 c2.9-2.2 7.4-4.4 7.4-7.4 c0-3.7 -4.6-5.5 -7.4-2z" fill="#ff2e74" />
      <path d="M88 16 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#ff2e74" />
    </svg>
  )
}
