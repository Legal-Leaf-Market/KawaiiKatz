/* eslint-disable @next/next/no-img-element */

/**
 * The cat and the panda, wherever the brand appears.
 *
 * These render <img> rather than inline SVG, and that is the point: the marks
 * are illustrated artwork (assets/logo-cat.png, assets/logo-panda.png), not
 * shapes that can be expressed as a handful of paths. scripts/mkicons.mjs cuts
 * /brand-cat.png and /brand-panda.png from whatever artwork is in assets/, so
 * replacing the brand across the whole site is: drop two files in, run
 * `pnpm icons`.
 *
 * They previously used the raw emoji, which rendered as whatever each visitor's
 * OS emoji font draws — on most platforms the "black cat" is periwinkle blue,
 * so the header showed a purple cat beside a plum favicon.
 *
 * Sized in CSS rather than by re-rendering: the source is 128px, so a 26px mark
 * still has ~5x for retina. Decorative, so aria-hidden — the adjacent text
 * already says "Kawaii Katz", and a screen reader used to announce
 * "cat Kawaii Katz panda".
 */

type MarkProps = { size?: number; className?: string }

const style = (size: number) => ({
  width: size,
  height: size,
  display: 'inline-block' as const,
  verticalAlign: '-0.22em',
  flexShrink: 0,
  objectFit: 'contain' as const,
})

export function CatMark({ size = 26, className }: MarkProps) {
  return <img src="/brand-cat.png" alt="" aria-hidden="true" className={className} style={style(size)} />
}

export function PandaMark({ size = 26, className }: MarkProps) {
  return <img src="/brand-panda.png" alt="" aria-hidden="true" className={className} style={style(size)} />
}
