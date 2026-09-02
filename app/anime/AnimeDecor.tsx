'use client'
import Image from 'next/image'

/**
 * The anime room's decoration: petals falling the whole page, the cast leaning
 * in from both margins, and neon haze behind the lot.
 *
 * -----------------------------------------------------------------------------
 * PORTED FROM DecoraDecor, WHICH IS WHAT THIS PAGE SHOULD HAVE BEEN FROM THE
 * START. The first cut of /anime was products on cream with a picture at the
 * top: it opened quiet and stayed quiet, which is the exact failure that
 * component's own header describes and had already solved. The animations
 * themselves (kkCharmFall, kkBob, kkTwinkle) are global and are reused rather
 * than restated, so the two rooms move in the same language.
 *
 * WHAT IS DIFFERENT, AND WHY.
 *
 *   PETALS ARE DRAWN, NOT PHOTOGRAPHED. Decora falls charm sheets. This room's
 *   pack has no equivalent loose object, and the one rule that matters is the
 *   one written on that component: a tumbling bow is confetti, a tumbling
 *   character is a cat being thrown down a well. So the falling layer is CSS
 *   petals, which costs no request, matches the sakura street in the hero, and
 *   can be spawned in numbers no sprite sheet would justify.
 *
 *   THE CAST BOBS AT xl, NOT 2xl. Decora waits for 2xl because its shelf is
 *   1180px on a near-black ground. This room reads on cream and the stickers
 *   are pale-bordered, so they hold up in a narrower margin.
 *
 * Everything is aria-hidden and pointer-events:none. This page has a cart
 * button and a save button on every tile, and decoration that eats one of
 * those clicks is worse than no decoration. The global reduced-motion rule
 * already stills all three animations and removes the falling layer outright.
 */

/* Six stickers, alternating sides the whole way down. `top` is a share of the
   DOCUMENT, not the viewport, so a character belongs to a band of shelf rather
   than following you down the screen. */
const RAIL = [
  { src: 'st-new.webp',   side: 'left',  top: '8%',  size: 150, tilt: -6, dur: 8.0, delay: 0 },
  { src: 'st-fit.webp',   side: 'right', top: '17%', size: 158, tilt: 5,  dur: 9.0, delay: -2 },
  { src: 'st-carry.webp', side: 'left',  top: '30%', size: 146, tilt: 7,  dur: 7.5, delay: -4 },
  { src: 'st-layer.webp', side: 'right', top: '43%', size: 152, tilt: -5, dur: 8.5, delay: -1 },
  { src: 'st-sleep.webp', side: 'left',  top: '58%', size: 156, tilt: -7, dur: 9.5, delay: -6 },
  { src: 'st-build.webp', side: 'right', top: '72%', size: 150, tilt: 6,  dur: 8.0, delay: -3 },
  { src: 'st-new.webp',   side: 'left',  top: '86%', size: 142, tilt: 4,  dur: 7.8, delay: -5 },
] as const

/* Petal field. Deterministic rather than Math.random: a server render and a
   client hydrate that disagree about where a petal sits is a hydration
   mismatch, and React will say so in the console on every load. */
const PETALS = Array.from({ length: 30 }, (_, i) => {
  const r = (n: number, m: number) => ((i * 9301 + n * 49297) % 233280) / 233280 * m
  return {
    left: `${(i * 3.37 + r(1, 6)) % 100}%`,
    size: 9 + r(2, 13),
    dur: 16 + r(3, 20),
    delay: -r(4, 34),
    drift: r(5, 260) - 130,
    spin: 200 + r(6, 620),
    o: 0.42 + r(7, 0.42),
    pink: i % 3 === 0,
  }
})

export default function AnimeDecor() {
  return (
    <>
      {/* NEON HAZE. Two soft washes fixed behind everything, in the hero's own
          magenta and violet, so the cream page keeps a trace of the night
          street all the way down instead of reverting to a plain shop. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span
          className="absolute -left-[12%] top-[8%] h-[52vh] w-[52vh] rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(183,156,255,.30), transparent 68%)' }}
        />
        <span
          className="absolute -right-[10%] top-[52%] h-[48vh] w-[48vh] rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(255,138,196,.28), transparent 68%)' }}
        />
      </div>

      {/* PETALS, falling the full scroll. Fixed, so the field does not need a
          container as tall as the document. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {PETALS.map((p, i) => (
          <span
            key={i}
            /* Every third one is desktop-only: thirty petals on a 390px phone
               is a screen of confetti with a shop somewhere behind it. */
            className={`kk-charm ${i % 3 === 1 ? 'hidden sm:block' : ''}`}
            style={{
              left: p.left,
              ['--dur' as string]: `${p.dur}s`,
              ['--delay' as string]: `${p.delay}s`,
              ['--drift' as string]: `${p.drift}px`,
              ['--spin' as string]: `${p.spin}deg`,
            }}
          >
            <span
              className="block"
              style={{
                width: p.size,
                height: p.size * 0.82,
                opacity: p.o,
                /* A petal, not a dot: round on one diagonal and pointed on the
                   other is the whole shape, and it costs no asset. */
                borderRadius: '80% 8% 80% 8%',
                background: p.pink
                  ? 'linear-gradient(140deg,#ffd7ec,#ff8ac4)'
                  : 'linear-gradient(140deg,#f6e6ff,#c9a4ff)',
              }}
            />
          </span>
        ))}
      </div>

      {/* THE CAST. Absolute inside the page so `top` is a share of the
          document. Only where there is genuinely empty margin beside the
          1180px shelf. */}
      {/* overflow-hidden is load-bearing, not tidiness. The twinkle behind a
          rail character is inset:-28%, so on a 158px sticker it is ~249px wide
          and hangs past the viewport edge. Without clipping here it added 36px
          of horizontal scroll to the whole page: measured, scrollWidth 1596
          against a 1560 viewport, and the widest offender was exactly that
          glow. A decorative element that makes the page scroll sideways is the
          same class of bug as one that eats a click. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block z-0 overflow-hidden">
        {RAIL.map((r, i) => (
          <div key={`${r.src}-${i}`} className="absolute" style={{ top: r.top, [r.side]: '10px' }}>
            <div className="relative">
              <span
                className="kk-twinkle absolute inset-[-28%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,138,196,.40), rgba(183,156,255,.20) 55%, transparent 72%)',
                  ['--dur' as string]: `${4 + i * 0.6}s`,
                  ['--delay' as string]: `${-i}s`,
                }}
              />
              <Image
                src={`/anime/${r.src}`}
                alt=""
                width={600}
                height={600}
                className="kk-bob relative h-auto drop-shadow-[0_10px_26px_rgba(79,69,80,.35)]"
                style={{
                  width: r.size,
                  ['--tilt' as string]: `${r.tilt}deg`,
                  ['--dur' as string]: `${r.dur}s`,
                  ['--delay' as string]: `${r.delay}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
