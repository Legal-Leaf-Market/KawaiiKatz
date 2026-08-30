'use client'
import Image from 'next/image'

/**
 * The room's decoration: charms falling past, and the cast down both sides.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * The page opened loud and then got quiet: below the hero it was a grid with a
 * pattern strip per heading, and by the time you reached the shops it read as
 * an ordinary catalogue. "More is more" is written on one of its own shelves.
 *
 * Two layers, and they do different jobs:
 *
 *   FALLING CHARMS drift the whole height of the page. Ported in spirit from
 *   Nicotia Market's leafFall, which is the animation Jacob asked for by name.
 *   They are what makes the page feel alive while you scroll.
 *
 *   RAIL CAST sits in the outer margins, one character per band, and BOBS
 *   rather than falls. A mascot drifting past like litter reads as a bug; a
 *   mascot leaning into the page from the edge reads as a mascot.
 *
 * -----------------------------------------------------------------------------
 * WHY IT CANNOT GET IN THE WAY
 *
 * Everything is `pointer-events: none` and `aria-hidden`. An earlier pass put
 * confetti over the hero's back-link and through the affiliate disclosure,
 * which is the exact failure to avoid: this page has a Pin button, an exclude
 * control and a cart on every tile, and decoration that eats one of those
 * clicks is worse than no decoration.
 *
 * The rails live OUTSIDE the content column. `max-w-[1180px]` is the shelf, so
 * the rails are pinned to the viewport edges and only appear at `2xl`, where
 * there is genuinely empty margin. Below that they would sit on top of product
 * cards, which is the same mistake by a different route.
 *
 * The charms are `position: fixed` so they fall past a page of any length
 * without a container tall enough to contain them.
 *
 * THEY SIT AT z-0 AND THE CONTENT AT z-10, which is fiddlier than it looks and
 * was wrong the first time. `-z-10` puts a child behind its own parent's
 * background, and the page root paints a solid #12071f, so the first version
 * rendered seven charms into a black hole: they were in the DOM, animating, and
 * invisible. z-0 puts them above that background; the header and main carry
 * z-10 so nothing ever falls across a product photograph.
 */

const IMG = '/decora/'

/** Falling pieces. Small, light, and none of them a character: a bow tumbling
 *  past is confetti, a tumbling Katz is a cat being thrown down a well. */
const CHARMS = [
  { src: 'charms-a.webp', w: 399, h: 220, left: '3%', size: 78, dur: 30, delay: 0, drift: 70, spin: 200 },
  { src: 'charms-c.webp', w: 617, h: 220, left: '10%', size: 54, dur: 44, delay: -9, drift: -80, spin: -260 },
  { src: 'charms-b.webp', w: 660, h: 220, left: '17%', size: 66, dur: 34, delay: -20, drift: 90, spin: 300 },
  { src: 'charms-d.webp', w: 536, h: 220, left: '24%', size: 48, dur: 50, delay: -5, drift: -60, spin: 180 },
  { src: 'charms-a.webp', w: 399, h: 220, left: '31%', size: 62, dur: 36, delay: -26, drift: 80, spin: -220 },
  { src: 'charms-c.webp', w: 617, h: 220, left: '38%', size: 72, dur: 32, delay: -14, drift: -70, spin: 240 },
  { src: 'charms-d.webp', w: 536, h: 220, left: '45%', size: 52, dur: 46, delay: -33, drift: 60, spin: -300 },
  { src: 'charms-b.webp', w: 660, h: 220, left: '52%', size: 58, dur: 38, delay: -7, drift: -90, spin: 210 },
  { src: 'charms-a.webp', w: 399, h: 220, left: '59%', size: 68, dur: 42, delay: -22, drift: 75, spin: -190 },
  { src: 'charms-c.webp', w: 617, h: 220, left: '66%', size: 50, dur: 52, delay: -3, drift: -55, spin: 280 },
  { src: 'charms-d.webp', w: 536, h: 220, left: '73%', size: 74, dur: 33, delay: -17, drift: 85, spin: -250 },
  { src: 'charms-b.webp', w: 660, h: 220, left: '80%', size: 56, dur: 40, delay: -29, drift: -75, spin: 230 },
  { src: 'charms-a.webp', w: 399, h: 220, left: '87%', size: 64, dur: 35, delay: -11, drift: 65, spin: -210 },
  { src: 'charms-c.webp', w: 617, h: 220, left: '93%', size: 46, dur: 48, delay: -37, drift: -50, spin: 320 },
  { src: 'charms-d.webp', w: 536, h: 220, left: '97%', size: 60, dur: 43, delay: -19, drift: 70, spin: -270 },
  { src: 'charms-b.webp', w: 660, h: 220, left: '7%', size: 44, dur: 56, delay: -41, drift: -95, spin: 160 },
]


/**
 * The cast, alternating sides down the page.
 *
 * `top` is a percentage of the page rather than the viewport, so a character
 * belongs to a band of content instead of following you down the screen. The
 * spares from the asset sheet finally get placed: the donut panda, Katz with
 * flowers, the sleeping bunny, the box peek.
 */
const RAIL = [
  { src: 'st-panda.webp', w: 320, h: 320, side: 'left', top: '7%', size: 132, tilt: -6, dur: 8, delay: 0 },
  { src: 'st-katzflower.webp', w: 353, h: 320, side: 'right', top: '13%', size: 138, tilt: 5, dur: 9, delay: -2 },
  { src: 'st-p2.webp', w: 318, h: 320, side: 'left', top: '20%', size: 126, tilt: 7, dur: 7.5, delay: -4 },
  { src: 'st-donut.webp', w: 320, h: 320, side: 'right', top: '27%', size: 130, tilt: -5, dur: 8.5, delay: -1 },
  { src: 'st-p5.webp', w: 338, h: 320, side: 'left', top: '34%', size: 128, tilt: -7, dur: 9.5, delay: -6 },
  { src: 'st-p8.webp', w: 329, h: 320, side: 'right', top: '40%', size: 134, tilt: 6, dur: 8, delay: -3 },
  { src: 'st-box.webp', w: 448, h: 320, side: 'left', top: '47%', size: 142, tilt: 4, dur: 7, delay: -5 },
  { src: 'st-p3.webp', w: 329, h: 320, side: 'right', top: '54%', size: 128, tilt: -6, dur: 8.8, delay: -8 },
  { src: 'st-p9.webp', w: 329, h: 320, side: 'left', top: '60%', size: 130, tilt: 6, dur: 7.8, delay: -2.5 },
  { src: 'st-panda.webp', w: 320, h: 320, side: 'right', top: '67%', size: 124, tilt: -4, dur: 9.2, delay: -7 },
  { src: 'st-p1.webp', w: 324, h: 320, side: 'left', top: '73%', size: 132, tilt: -8, dur: 8.2, delay: -1.5 },
  { src: 'st-p6.webp', w: 250, h: 320, side: 'right', top: '79%', size: 112, tilt: 7, dur: 7.2, delay: -4.5 },
  { src: 'st-p4.webp', w: 351, h: 320, side: 'left', top: '85%', size: 136, tilt: 5, dur: 9, delay: -9 },
  { src: 'st-p10.webp', w: 320, h: 320, side: 'right', top: '90%', size: 126, tilt: -6, dur: 8.4, delay: -3.5 },
  { src: 'st-p7.webp', w: 331, h: 320, side: 'left', top: '95%', size: 130, tilt: 4, dur: 7.6, delay: -6.5 },
  { src: 'st-bunny.webp', w: 419, h: 320, side: 'right', top: '98%', size: 140, tilt: -5, dur: 8.6, delay: 0 },
] as const

export default function DecoraDecor() {
  return (
    <>
      {/* CHARMS. Fixed to the viewport so they fall for the whole scroll, and
          behind everything so a bow never lands on a product photograph. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {CHARMS.map((c, i) => (
          <span
            key={`${c.src}-${i}`}
            /* Half of them are desktop-only. Sixteen charms across a 390px
               phone is not maximalist, it is a screen full of bows with a shop
               somewhere behind it. */
            className={`kk-charm ${i % 2 ? 'hidden sm:block' : ''}`}
            style={
              {
                left: c.left,
                '--dur': `${c.dur}s`,
                '--delay': `${c.delay}s`,
                '--drift': `${c.drift}px`,
                '--spin': `${c.spin}deg`,
              } as React.CSSProperties
            }
          >
            <Image
              src={`${IMG}${c.src}`}
              alt=""
              width={c.w}
              height={c.h}
              className="h-auto opacity-55"
              style={{ width: c.size }}
            />
          </span>
        ))}
      </div>

      {/* RAIL CAST. Only at 2xl, where the margin beside the 1180px shelf is
          genuinely empty. Absolute inside the page, so `top` is a share of the
          document and a character stays with its band of content. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden 2xl:block">
        {RAIL.map((r, i) => (
          <div
            key={`${r.src}-${i}`}
            className="absolute"
            style={{ top: r.top, [r.side]: '18px' } as React.CSSProperties}
          >
            <div className="relative">
              {/* A glow instead of a second asset: gives the corner depth and
                  keeps a pale character readable on the near-black ground. */}
              <span
                className="kk-twinkle absolute inset-[-26%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,45,146,.34), rgba(139,61,255,.16) 55%, transparent 72%)',
                  ['--dur' as string]: `${4 + i * 0.6}s`,
                  ['--delay' as string]: `${-i}s`,
                }}
              />
              <Image
                src={`${IMG}${r.src}`}
                alt=""
                width={r.w}
                height={r.h}
                className="kk-bob relative h-auto drop-shadow-[0_10px_24px_rgba(0,0,0,.6)]"
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
