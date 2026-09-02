'use client'
import Image from 'next/image'

/**
 * The Anime room's decoration: petals falling, screen-tone drifting, and the
 * cast down both margins.
 *
 * -----------------------------------------------------------------------------
 * THREE LAYERS, NOT TWO, AND THE THIRD IS THE ONE THAT MAKES IT ANIME
 *
 * /decora has falling charms and a rail cast (components/DecoraDecor.tsx). This
 * room keeps both and adds a DRIFTING SCREEN, because the register it is
 * drawing is print: speed lines and halftone dots are what a manga page does
 * when something is moving, and a still one reads as wallpaper. The two tiles
 * scroll slowly in opposite directions, which is cheap (two background-position
 * animations, no elements) and is the single thing that stops the page looking
 * like /decora in a different palette.
 *
 * -----------------------------------------------------------------------------
 * THE PETALS ARE INLINE SVG AND THE CHARMS ON /decora ARE NOT
 *
 * `pat-sakura.webp` exists, but it is a seamless TILE: one file holding a
 * scattered field, which is the right shape for a background and the wrong
 * shape for sixteen independently-falling sprites. Cutting sprites out of it in
 * CSS would mean sixteen background-position crops of one image, all animating,
 * and each one would still carry the tile's own spacing.
 *
 * So the falling pieces are drawn, for the same three reasons §4e-b gives for
 * the kawaii confetti: they are exactly on palette because they ARE the
 * palette, they cannot blur at any size because a vector has no native size to
 * exceed, and a petal is a few hundred bytes against 20KB of tile.
 *
 * -----------------------------------------------------------------------------
 * WHY IT CANNOT GET IN THE WAY
 *
 * Everything is `pointer-events: none` and `aria-hidden`. This page has a Pin
 * button, an exclude control and a cart on every tile, and decoration that eats
 * one of those clicks is worse than no decoration.
 *
 * z-0 for the decoration and z-10 for the content, never `-z-10`. That puts a
 * child behind its own parent's background, and this page root paints a solid
 * #0a0614, so the first version of the Decora equivalent rendered its charms
 * into a black hole: in the DOM, animating, invisible.
 */

const IMG = '/anime/'

/** Sakura, in three tints off the room's palette. */
const PETAL_FILLS = ['#ff5fb0', '#ffa8d6', '#c98cff', '#ffd6ec'] as const

function Petal({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden focusable="false">
      {/* One petal: a rounded teardrop with the notch a cherry petal has. */}
      <path
        d="M12 1c4.6 3.1 7.4 7 7.4 11.2 0 4.2-3.3 7.3-7.4 7.3S4.6 16.4 4.6 12.2C4.6 8 7.4 4.1 12 1Z"
        fill={fill}
        opacity="0.92"
      />
      <path d="M12 19.5c-1.1-1.6-1.7-3.4-1.7-5.2 0-2.6 1-5.1 1.7-6.6.7 1.5 1.7 4 1.7 6.6 0 1.8-.6 3.6-1.7 5.2Z" fill="#fff" opacity="0.22" />
    </svg>
  )
}

/**
 * Falling pieces. Twenty-two of them, half held back below `sm`.
 *
 * Jacob asked for saturation and this is where most of it lives, but a phone is
 * 390px wide: twenty-two petals across it is a screen of petals with a shop
 * somewhere behind them, which is the opposite of the ask. Eleven on a phone,
 * twenty-two on a desktop.
 */
const PETALS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 4.5 + (i % 3) * 2.2) % 99}%`,
  size: 14 + ((i * 7) % 20),
  dur: 26 + ((i * 5) % 30),
  delay: -((i * 3.7) % 44),
  drift: (i % 2 ? 1 : -1) * (40 + ((i * 13) % 70)),
  spin: (i % 2 ? 1 : -1) * (160 + ((i * 29) % 220)),
  fill: PETAL_FILLS[i % PETAL_FILLS.length],
}))

/**
 * The cast, alternating sides down the page.
 *
 * `top` is a percentage of the DOCUMENT rather than the viewport, so a
 * character belongs to a band of content instead of following you down the
 * screen. That needs a positioned, document-height ancestor: the page root is
 * `relative`, and without it `absolute` resolves to the viewport-sized initial
 * containing block and all sixteen pile into the first screen.
 *
 * Six poses across sixteen slots, so each appears two or three times. On
 * /decora there were sixteen distinct poses; here the sheet has six, and
 * spacing the repeats at least three slots apart is what keeps it from reading
 * as a repeat.
 */
const POSES = [
  { src: 'st-fit.webp', w: 600, h: 600 },
  { src: 'st-carry.webp', w: 600, h: 600 },
  { src: 'st-sleep.webp', w: 600, h: 600 },
  { src: 'st-build.webp', w: 600, h: 600 },
  { src: 'st-layer.webp', w: 600, h: 600 },
  { src: 'st-new.webp', w: 600, h: 600 },
] as const

const RAIL = Array.from({ length: 16 }, (_, i) => ({
  ...POSES[i % POSES.length],
  side: (i % 2 ? 'right' : 'left') as 'left' | 'right',
  top: `${6 + i * 6}%`,
  size: 120 + ((i * 11) % 30),
  tilt: (i % 2 ? 1 : -1) * (4 + (i % 5)),
  dur: 7 + ((i * 3) % 4),
  delay: -(i * 1.3),
}))

export default function AnimeDecor() {
  return (
    <>
      {/* THE SCREEN. Two print textures drifting in opposite directions, fixed
          to the viewport so the whole scroll happens over them. Backgrounds
          rather than elements: two animated background-positions cost nothing
          and there is no DOM to trip over. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="kk-drift-a absolute inset-[-20%] opacity-[0.10]"
          style={{ backgroundImage: `url(${IMG}pat-speed.webp)`, backgroundSize: '340px auto' }}
        />
        <div
          className="kk-drift-b absolute inset-[-20%] opacity-[0.14]"
          style={{ backgroundImage: `url(${IMG}pat-tone.webp)`, backgroundSize: '190px auto' }}
        />
        <div
          className="kk-drift-c absolute inset-[-20%] opacity-[0.16]"
          style={{ backgroundImage: `url(${IMG}pat-sakura.webp)`, backgroundSize: '420px auto' }}
        />
      </div>

      {/* PETALS. Fixed, so they fall for the whole scroll however long the page
          gets, and behind everything so one never lands on a product photo. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {PETALS.map((p, i) => (
          <span
            key={i}
            className={`kk-charm ${i % 2 ? 'hidden sm:block' : ''}`}
            style={
              {
                left: p.left,
                width: p.size,
                height: p.size,
                '--dur': `${p.dur}s`,
                '--delay': `${p.delay}s`,
                '--drift': `${p.drift}px`,
                '--spin': `${p.spin}deg`,
              } as React.CSSProperties
            }
          >
            <Petal fill={p.fill} />
          </span>
        ))}
      </div>

      {/* RAIL CAST. Only at 2xl, where the margin beside the 1180px shelf is
          genuinely empty: at 1900px it is 178px a side and a 130px character
          pinned 18px from the edge cannot reach the column. Below that they
          would sit on product cards, which is the same mistake by another
          route.

          `overflow-hidden` is load-bearing. The twinkle behind each character
          is `inset-[-24%]`, so on the right-hand side it reaches past the
          viewport edge and gives the whole document a horizontal scrollbar.
          Measured at 1900px: 1,921 scroll width against a 1,900 client width,
          and /decora has carried the identical defect since it shipped.
          Clipping costs nothing, because a glow whose outer 24% is cut is
          still a glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden 2xl:block">
        {RAIL.map((r, i) => (
          <div
            key={i}
            className="absolute"
            style={{ top: r.top, [r.side]: '18px' } as React.CSSProperties}
          >
            <div className="relative">
              {/* A glow rather than a second asset. Katz is a black cat, so
                  every pose of him is dark, and on a near-black page he
                  disappears where the other two read fine. This is the /decora
                  fix applied before the problem arrives. */}
              <span
                className="kk-twinkle absolute inset-[-24%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,95,176,.36), rgba(139,61,255,.18) 55%, transparent 72%)',
                  ['--dur' as string]: `${4 + i * 0.5}s`,
                  ['--delay' as string]: `${-i}s`,
                }}
              />
              <Image
                src={`${IMG}${r.src}`}
                alt=""
                width={r.w}
                height={r.h}
                className="kk-bob relative h-auto drop-shadow-[0_10px_26px_rgba(0,0,0,.7)]"
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
