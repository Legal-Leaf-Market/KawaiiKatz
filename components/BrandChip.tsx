/* eslint-disable @next/next/no-img-element */

/**
 * The Kawaii Katz logo chip.
 *
 * This is the site's ORIGINAL cat — the 1024px mark that predates the icon
 * work in this session, recovered from git and trimmed of the white margin it
 * carried inside its own canvas. It is not a redraw.
 *
 * It exists because the header had no mark at all after the redesign was
 * reverted, and a bare wordmark is a worse answer than the brand's own icon.
 * The emoji it originally replaced are not an option: they render in the
 * reader's OS emoji font, and the black-cat emoji comes out periwinkle blue on
 * most platforms, which is the mismatch that started all of this.
 *
 * Decorative — the adjacent text says "Kawaii Katz", so it is aria-hidden.
 *
 * If illustrated artwork lands at assets/logo-cat.png, scripts/mkicons.mjs
 * overwrites /brand-cat.png and this chip picks it up with no code change.
 */
export default function BrandChip({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand-cat.png"
      alt=""
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        display: 'inline-block',
        verticalAlign: '-0.28em',
        flexShrink: 0,
        objectFit: 'contain',
      }}
    />
  )
}
