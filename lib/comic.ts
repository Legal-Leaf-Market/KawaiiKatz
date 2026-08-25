/**
 * The cat-and-panda comic strip: what one is, and how it gets to Instagram.
 *
 * -----------------------------------------------------------------------------
 * THIS FILE DESCRIBES A STRIP. NOTHING HERE GENERATES ART.
 *
 * Panel art comes from one of two places, and both are already in hand:
 *
 *   1. The brand marks — /brand-cat.png and /brand-panda.png, the same two
 *      illustrations the header uses. Posed, scaled and mirrored by the
 *      renderer. A mascot that is the same drawing every time is the entire
 *      point of having a mascot, so this is the default.
 *   2. An image you drop in — a panel drawn elsewhere. The studio scales it to
 *      the panel and puts the bubbles on top.
 *
 * There is no image model wired in and no API key needed. The studio is a
 * composition and export tool: it does layout, speech bubbles, the brand
 * furniture and the 1080x1350 crop, which is the fiddly part to do by hand and
 * the part that has to be identical across every post.
 */

/** Instagram's portrait slot. Anything else gets cropped in the feed. */
export const IG_W = 1080
export const IG_H = 1350

/**
 * Where a panel's picture comes from.
 *
 * 'upload' means the panel carries its own image; everything else composes the
 * brand marks. Kept as one field rather than a separate boolean because a panel
 * has exactly one source and two flags would allow a state that means nothing.
 */
export type Art = 'cat' | 'panda' | 'both' | 'none' | 'upload'

/** Where a character stands. The renderer mirrors the art to face inward. */
export type Placement = 'left' | 'right' | 'center'

export type Scale = 'far' | 'mid' | 'near' | 'huge'

export type Panel = {
  art: Art
  /** Used when `art` is a single character. Ignored for 'both' and 'upload'. */
  placement: Placement
  scale: Scale
  /**
   * The panel's own picture, as a data URL, when `art` is 'upload'.
   *
   * A data URL rather than an object URL on purpose: object URLs die with the
   * page, so a draft reloaded tomorrow would be a strip of empty panels with no
   * indication anything had been lost. Downscaled on the way in — see
   * MAX_UPLOAD_PX — so a four-panel strip stays inside the localStorage quota.
   */
  image?: string
  /** Speech bubble on the left. Empty means nobody speaks there. */
  cat?: string
  /** Speech bubble on the right. */
  panda?: string
  /** Narration across the top — the caption-box voice, not a bubble. */
  caption?: string
  /**
   * The picture description for this panel, written to be pasted into an image
   * tool. Never drawn — it is the handoff to whoever makes the art.
   *
   * Optional because a hand-built strip has no use for one, and because drafts
   * saved before the writer existed must still load: JSON.parse of an old draft
   * yields panels without this field, and a required field would have made
   * every one of them a type lie.
   */
  artNote?: string
}

export type Strip = {
  title: string
  panels: Panel[]
  /** The Instagram caption. */
  caption: string
  /** Without the leading #. */
  hashtags: string[]
}

/**
 * Longest edge an uploaded panel is stored at.
 *
 * A panel is at most 513px wide in the exported 1080x1350, so 900 leaves room
 * for a full-bleed single-column layout and still throws away most of a phone
 * photo. It matters because these live in localStorage, which is a ~5MB budget
 * for the whole origin: four untouched 4MB PNGs would blow it, and the failure
 * is a silent QuotaExceededError that loses the draft.
 */
export const MAX_UPLOAD_PX = 900

/** Panel counts the layout has a grid for. */
export const PANEL_COUNTS = [1, 2, 3, 4, 6] as const

/** Rows and columns for each supported count. */
export function grid(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 }
  if (n === 2) return { cols: 1, rows: 2 }
  if (n === 3) return { cols: 1, rows: 3 }
  if (n === 4) return { cols: 2, rows: 2 }
  return { cols: 2, rows: 3 }
}

/** How much of the panel height a brand mark occupies, by scale. */
export const SCALE_FRACTION: Record<Scale, number> = {
  far: 0.34,
  mid: 0.5,
  near: 0.68,
  huge: 0.88,
}

/**
 * The palette, taken from the site rather than invented.
 *
 * A strip that does not look like kawaiikatz.com is doing half its job: the
 * point of posting it is that somebody later recognises the same cat and the
 * same peach-and-mint when they land on the shop.
 */
export const INK = '#4f4550'
export const PAPER = '#fffaf0'
export const CORAL = '#ff8a65'
export const PANEL_BGS = ['#bfe3ea', '#e6dcff', '#ffb199', '#c9ecd2', '#ffe6d9', '#d9ecff']

export function emptyPanel(): Panel {
  return { art: 'both', placement: 'center', scale: 'mid' }
}

export function emptyStrip(count: number): Strip {
  return {
    title: 'Untitled strip',
    panels: Array.from({ length: count }, emptyPanel),
    caption: '',
    hashtags: ['KawaiiKatz', 'KawaiiFinds', 'CuteThings'],
  }
}
