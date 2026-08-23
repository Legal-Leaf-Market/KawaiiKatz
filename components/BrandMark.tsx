/* eslint-disable @next/next/no-img-element */

/**
 * The cat and the panda, wherever the brand appears.
 *
 * These are the illustrated marks from assets/logo-cat.webp and
 * assets/logo-panda.webp, cut to /brand-cat.png and /brand-panda.png by
 * scripts/mkicons.mjs. Replacing the brand everywhere is: swap those two source
 * files, run `pnpm icons`. No component changes.
 *
 * <img> rather than inline SVG, necessarily — this is illustration, not a
 * handful of paths.
 *
 * They replaced the raw emoji, which rendered in each visitor's OS emoji font;
 * on most platforms the black-cat emoji is periwinkle blue, so the header
 * showed a purple cat next to a plum favicon.
 *
 * Decorative, so aria-hidden — the adjacent text already says "Kawaii Katz",
 * and a screen reader used to announce "cat Kawaii Katz panda".
 */

type MarkProps = { size?: number; className?: string }

const style = (size: number) => ({
  width: size,
  height: size,
  display: 'inline-block' as const,
  verticalAlign: '-0.26em',
  flexShrink: 0,
  objectFit: 'contain' as const,
})

export function CatMark({ size = 30, className }: MarkProps) {
  return <img src="/brand-cat.png" alt="" aria-hidden="true" className={className} style={style(size)} />
}

export function PandaMark({ size = 30, className }: MarkProps) {
  return <img src="/brand-panda.png" alt="" aria-hidden="true" className={className} style={style(size)} />
}
