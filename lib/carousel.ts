import type { Article, Block } from './articles'
import { money, type Product } from './data'

/**
 * Carousel decks: articles and product rails, cut into slides.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS IS CHEAP TO BUILD
 *
 * lib/articles.ts stores bodies as typed blocks rather than markdown, and the
 * stated reason was this file: a slide is a heading plus a few lines, which is
 * already the shape of a block. So cutting an article into slides is a walk
 * over an array, not a markdown parse and a guess at where to break.
 *
 * -----------------------------------------------------------------------------
 * TWO SIZES, ONE LAYOUT
 *
 * 1080x1350 is the Instagram feed slot. 1080x1920 is TikTok Photo Mode,
 * Instagram Stories and Lemon8. Both are drawn from the same slide data by the
 * renderer, which is the entire reason the carousel is worth more effort than
 * the comic ever was: one deck, four platforms.
 */

export const SIZES = {
  feed: { w: 1080, h: 1350, label: 'Instagram feed' },
  vertical: { w: 1080, h: 1920, label: 'TikTok, Stories, Lemon8' },
} as const

export type SizeKey = keyof typeof SIZES

/**
 * How many lines fit on one slide before it stops being readable at thumbnail
 * size. Five is the number at which a phone-sized slide still has air in it.
 */
const MAX_LINES = 5

export type Slide =
  /** Slide one. Big title, one line of hook, the thing that earns the swipe. */
  | { kind: 'cover'; emoji: string; title: string; hook: string }
  /** A heading and up to MAX_LINES bullets. */
  | { kind: 'points'; heading: string; lines: string[] }
  /** One paragraph, set large. For a single idea that needs no list. */
  | { kind: 'quote'; heading: string; text: string }
  /** A product: photo, name, price, shop. */
  | { kind: 'product'; image: string; name: string; price: string; vendor: string; badge?: string }
  /** The last slide. Always the same, always a call to action. */
  | { kind: 'outro'; line: string }

export type Deck = {
  /** Used for the downloaded filenames. */
  slug: string
  title: string
  slides: Slide[]
  /** A ready-to-paste caption. #ad is added by the studio, not here. */
  caption: string
  hashtags: string[]
}

/** Splits a long list across as many slides as it needs. */
function chunk(lines: string[], n = MAX_LINES): string[][] {
  const out: string[][] = []
  for (let i = 0; i < lines.length; i += n) out.push(lines.slice(i, i + n))
  return out
}

/**
 * A table becomes bullets, because a table does not survive being shrunk to a
 * phone screen. "A" and "B" join with a colon, which reads as the same
 * relationship the two columns had.
 */
function tableLines(b: Extract<Block, { t: 'table' }>): string[] {
  return b.rows.map((r) => (r.length > 1 ? `${r[0]}: ${r.slice(1).join(', ')}` : r[0]))
}

/**
 * Cut an article into a deck.
 *
 * The walk carries a "current heading" because blocks are flat: an `h` opens a
 * section and everything until the next `h` belongs to it. A `note` breaks out
 * on its own slide, since a note is by definition the thing a skimmer must not
 * miss and burying it in a list defeats the point.
 */
export function deckFromArticle(a: Article): Deck {
  const slides: Slide[] = [
    { kind: 'cover', emoji: a.emoji, title: a.title, hook: a.answer },
  ]

  let heading = ''
  let pending: string[] = []

  const flush = () => {
    if (!pending.length) return
    for (const c of chunk(pending)) slides.push({ kind: 'points', heading, lines: c })
    pending = []
  }

  for (const b of a.body) {
    switch (b.t) {
      case 'h':
        flush()
        heading = b.text
        break
      case 'ul':
      case 'ol':
        pending.push(...b.items)
        break
      case 'table':
        pending.push(...tableLines(b))
        break
      case 'p':
        // A paragraph among bullets joins the list; a paragraph alone under a
        // heading gets the room to be read.
        if (pending.length) pending.push(b.text)
        else slides.push({ kind: 'quote', heading, text: b.text })
        break
      case 'note':
        flush()
        slides.push({ kind: 'quote', heading: 'Worth knowing', text: b.text })
        break
    }
  }
  flush()

  slides.push({ kind: 'outro', line: 'Full guide and 4,000+ cute things at kawaiikatz.com' })

  return {
    slug: a.slug,
    title: a.title,
    caption: a.answer,
    hashtags: ['KawaiiKatz', 'KawaiiFinds', ...a.tags.map((t) => t.replace(/[^A-Za-z0-9]/g, ''))]
      .filter(Boolean)
      .slice(0, 10),
  slides,
  }
}

/** Cut a list of products into a deck. Used for drops, price cuts and guides. */
export function deckFromProducts(
  opts: { slug: string; emoji: string; title: string; hook: string; hashtags: string[] },
  products: Product[]
): Deck {
  return {
    slug: opts.slug,
    title: opts.title,
    caption: opts.hook,
    hashtags: ['KawaiiKatz', ...opts.hashtags].filter(Boolean).slice(0, 10),
    slides: [
      { kind: 'cover', emoji: opts.emoji, title: opts.title, hook: opts.hook },
      ...products.map(
        (p): Slide => ({
          kind: 'product',
          image: p.image,
          name: p.name,
          price: money(p.price),
          vendor: p.vendor,
          // The discount is the reason a price-drop slide exists, so it is the
          // one thing allowed to shout.
          badge: p.onSale && p.discountPct > 0 ? `-${p.discountPct}%` : undefined,
        })
      ),
      { kind: 'outro', line: 'All of these, and 4,000+ more, at kawaiikatz.com' },
    ],
  }
}
