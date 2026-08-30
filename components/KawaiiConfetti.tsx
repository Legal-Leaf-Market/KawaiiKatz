'use client'
import Image from 'next/image'

/**
 * The kawaii side's half of the falling animation.
 *
 * -----------------------------------------------------------------------------
 * SAME MOTION, DIFFERENT PIECES, AND THAT IS THE POINT
 *
 * Jacob's ask was for the two rooms to feel like one site while staying
 * obviously different. So the MOTION is shared outright: `kkCharmFall` and
 * `kkBob` are the same keyframes /decora uses, defined once in globals.css.
 * Walking from the shop floor into the decora room, the page moves the same way
 * and only the cast changes.
 *
 * What is NOT shared is the artwork, and that was a judgement rather than
 * laziness. The decora charm sheets are hot pink and black: paw prints, safety
 * pins and goth bows, drawn to sit on a near-black room. On #fffaf0 the black
 * pieces read heavy and a little mean, which is the opposite of this side.
 *
 * -----------------------------------------------------------------------------
 * WHY THE CONFETTI IS DRAWN AND NOT A FILE
 *
 * These are inline SVG, not images, for three reasons that all matter here:
 *
 *   - They are EXACTLY on palette, because they are filled from the same tokens
 *     the rest of the site uses (coral, sky, mint, sun, lavender).
 *   - They cannot blur. The whole /decora blur note is about a 900px source
 *     stretched past native; a vector has no native size to exceed, which is
 *     the honest fix rather than a treatment that hides the problem.
 *   - They cost nothing. No request, no decode, a few hundred bytes of markup
 *     against ~50KB per charm sheet.
 *
 * The CAST is reused from /decora unchanged, and that is the deliberate bridge:
 * Katz and Panda are this site's own mascots (public/brand-cat.png is the same
 * cat), so seeing them in the margins of both rooms is the thing that ties the
 * two together.
 *
 * -----------------------------------------------------------------------------
 * IT CANNOT GET IN THE WAY
 *
 * `pointer-events: none` and `aria-hidden` throughout. z-0 on the layer and the
 * page content above it: `-z-10` would put this behind the body's own cream
 * background and render it invisible, which is exactly the bug /decora shipped
 * once already. Reduced motion switches all of it off in globals.css.
 */

type Piece = { shape: 'heart' | 'bow' | 'star' | 'sparkle'; fill: string }

const CORAL = '#ffb199'
const CORAL2 = '#ff8a65'
const SKY = '#7fc4d4'
const MINT = '#6bc98a'
const SUN = '#ffd873'
const LAV = '#b79cff'
const ROSE = '#ff5a7a'

function Shape({ shape, fill }: Piece) {
  const common = { fill, stroke: 'rgba(79,69,80,.22)', strokeWidth: 1.5 }
  if (shape === 'heart') {
    return (
      <svg viewBox="0 0 32 30" width="100%" height="100%">
        <path
          d="M16 28C7 21.5 2 16.8 2 11.2 2 6.7 5.6 3 10 3c2.6 0 5 1.3 6 3.4C17 4.3 19.4 3 22 3c4.4 0 8 3.7 8 8.2C30 16.8 25 21.5 16 28z"
          {...common}
        />
      </svg>
    )
  }
  if (shape === 'bow') {
    return (
      <svg viewBox="0 0 40 26" width="100%" height="100%">
        <path d="M18 13 4 4c-2-1.3-4 .2-4 2.6v12.8C0 21.8 2 23.3 4 22l14-9z" {...common} />
        <path d="M22 13l14-9c2-1.3 4 .2 4 2.6v12.8c0 2.4-2 3.9-4 2.6l-14-9z" {...common} />
        <circle cx="20" cy="13" r="4.4" {...common} />
      </svg>
    )
  }
  if (shape === 'star') {
    return (
      <svg viewBox="0 0 32 31" width="100%" height="100%">
        <path d="M16 1l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L16 24.6 6.7 29.5l1.8-10.3L1 11.9l10.4-1.5z" {...common} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 30 30" width="100%" height="100%">
      <path d="M15 0c1.2 8.4 6.4 13.6 15 15-8.6 1.4-13.8 6.6-15 15-1.2-8.4-6.4-13.6-15-15C8.6 13.6 13.8 8.4 15 0z" {...common} />
    </svg>
  )
}

/** Eighteen pieces, spread across the width and across the clock. */
const CONFETTI: (Piece & {
  left: string
  size: number
  dur: number
  delay: number
  drift: number
  spin: number
})[] = [
  { shape: 'heart',   fill: ROSE,   left: '3%',  size: 35, dur: 34, delay: 0,   drift: 70,  spin: 180 },
  { shape: 'star',    fill: SUN,    left: '9%',  size: 29, dur: 46, delay: -12, drift: -80, spin: -240 },
  { shape: 'bow',     fill: CORAL,  left: '15%', size: 44, dur: 38, delay: -25, drift: 90,  spin: 260 },
  { shape: 'sparkle', fill: SKY,    left: '21%', size: 26, dur: 52, delay: -6,  drift: -55, spin: 200 },
  { shape: 'heart',   fill: CORAL2, left: '27%', size: 32, dur: 40, delay: -31, drift: 65,  spin: -200 },
  { shape: 'bow',     fill: LAV,    left: '34%', size: 41, dur: 36, delay: -17, drift: -85, spin: 300 },
  { shape: 'star',    fill: MINT,   left: '40%', size: 30, dur: 48, delay: -3,  drift: 75,  spin: -180 },
  { shape: 'sparkle', fill: ROSE,   left: '46%', size: 23, dur: 56, delay: -22, drift: -60, spin: 220 },
  { shape: 'heart',   fill: LAV,    left: '52%', size: 38, dur: 33, delay: -9,  drift: 80,  spin: 240 },
  { shape: 'bow',     fill: SKY,    left: '58%', size: 39, dur: 44, delay: -28, drift: -70, spin: -260 },
  { shape: 'star',    fill: CORAL,  left: '65%', size: 33, dur: 37, delay: -14, drift: 60,  spin: 190 },
  { shape: 'sparkle', fill: SUN,    left: '71%', size: 28, dur: 50, delay: -35, drift: -90, spin: -210 },
  { shape: 'heart',   fill: SKY,    left: '77%', size: 36, dur: 35, delay: -1,  drift: 85,  spin: 270 },
  { shape: 'bow',     fill: ROSE,   left: '83%', size: 42, dur: 42, delay: -19, drift: -65, spin: -230 },
  { shape: 'star',    fill: LAV,    left: '89%', size: 29, dur: 47, delay: -7,  drift: 70,  spin: 210 },
  { shape: 'sparkle', fill: MINT,   left: '94%', size: 25, dur: 54, delay: -26, drift: -50, spin: -280 },
  { shape: 'heart',   fill: SUN,    left: '97%', size: 32, dur: 39, delay: -33, drift: 60,  spin: 160 },
  { shape: 'bow',     fill: CORAL2, left: '6%',  size: 38, dur: 51, delay: -40, drift: -95, spin: 250 },
]

/**
 * The cast, from the decora pack, in the outer margins.
 *
 * `2xl` only, where the margin beside the 1180px column is genuinely empty, and
 * `top` is a share of the document so a character belongs to a band of content
 * rather than following the scroll. Same rules as the decora rail.
 */
const RAIL = [
  { src: 'st-katz.webp', w: 351, h: 320, side: 'left', top: '10%', size: 124, tilt: -6, dur: 8, delay: 0 },
  { src: 'st-panda.webp', w: 320, h: 320, side: 'right', top: '20%', size: 118, tilt: 5, dur: 9, delay: -2 },
  { src: 'st-donut.webp', w: 320, h: 320, side: 'left', top: '31%', size: 120, tilt: 6, dur: 7.5, delay: -5 },
  { src: 'st-box.webp', w: 448, h: 320, side: 'right', top: '42%', size: 132, tilt: -4, dur: 8.5, delay: -1 },
  { src: 'st-katzflower.webp', w: 353, h: 320, side: 'left', top: '53%', size: 126, tilt: -7, dur: 9.5, delay: -7 },
  { src: 'st-p10.webp', w: 320, h: 320, side: 'right', top: '64%', size: 120, tilt: 6, dur: 8, delay: -3 },
  { src: 'st-p3.webp', w: 329, h: 320, side: 'left', top: '75%', size: 124, tilt: 4, dur: 8.8, delay: -6 },
  { src: 'st-panda.webp', w: 320, h: 320, side: 'right', top: '86%', size: 116, tilt: -5, dur: 7.8, delay: -4 },
] as const

export default function KawaiiConfetti() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            // Half are desktop-only. Eighteen pieces on a 390px phone is snow.
            className={`kk-charm ${i % 2 ? 'hidden sm:block' : ''}`}
            style={
              {
                left: c.left,
                width: c.size,
                height: c.size,
                // 0.72, not 0.5: these are pale shapes on a cream page, and at
                // half opacity they read as dust on the screen rather than as
                // confetti. The decora charms can sit at 0.55 because they are
                // saturated pink on near-black.
                opacity: 0.72,
                '--dur': `${c.dur}s`,
                '--delay': `${c.delay}s`,
                '--drift': `${c.drift}px`,
                '--spin': `${c.spin}deg`,
              } as React.CSSProperties
            }
          >
            <Shape shape={c.shape} fill={c.fill} />
          </span>
        ))}
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 hidden 2xl:block">
        {RAIL.map((r, i) => (
          <div
            key={`${r.src}-${i}`}
            className="absolute"
            style={{ top: r.top, [r.side]: '20px' } as React.CSSProperties}
          >
            <div className="relative">
              {/* A pale halo, not the decora room's hot-pink one: on cream it
                  only has to lift the character off the page. */}
              <span
                className="kk-twinkle absolute inset-[-24%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,177,153,.42), rgba(183,156,255,.2) 55%, transparent 72%)',
                  ['--dur' as string]: `${4.5 + i * 0.5}s`,
                  ['--delay' as string]: `${-i}s`,
                }}
              />
              <Image
                src={`/decora/${r.src}`}
                alt=""
                width={r.w}
                height={r.h}
                className="kk-bob relative h-auto drop-shadow-[0_8px_18px_rgba(79,69,80,.22)]"
                style={
                  {
                    width: r.size,
                    '--tilt': `${r.tilt}deg`,
                    '--dur': `${r.dur}s`,
                    '--delay': `${r.delay}s`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
