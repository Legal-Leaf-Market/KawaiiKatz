import { cover, fitText, loadImage, roundRect, wrapText } from './canvas-kit'
import { SIZES, type Deck, type SizeKey, type Slide } from './carousel'

/**
 * Draws one carousel slide.
 *
 * -----------------------------------------------------------------------------
 * THE SAME SLIDE AT TWO ASPECT RATIOS, NOT TWO DESIGNS
 *
 * Everything is positioned from the canvas dimensions rather than from
 * constants, so 1080x1350 and 1080x1920 are the same layout with more or less
 * vertical room. That is what keeps a deck consistent across the Instagram feed
 * and TikTok Photo Mode without anyone maintaining two sets of numbers.
 *
 * The taller size gets its extra height as padding rather than as bigger type.
 * Type that scales with the canvas would make Stories slides shout and feed
 * slides whisper, and the two would stop looking like the same account.
 *
 * -----------------------------------------------------------------------------
 * SAFE AREAS
 *
 * On 1080x1920, the top and bottom of the frame are covered by platform UI:
 * profile chrome and the caption on TikTok, the reply bar on Stories. Nothing
 * that has to be read goes in the outer 12% at either end, which is what
 * SAFE_V buys. On the feed size there is no such overlay and the padding is
 * just breathing room.
 */

const PAPER = '#fffaf0'
const INK = '#4f4550'
const MUTED = '#9a8fa3'
const CORAL = '#ff8a65'
const PEACH = '#ffb199'
const BLUE = '#6495ED'
const PINK = '#e0227a'
const LILAC = '#e6dcff'

const display = (px: number) => `800 ${px}px "Baloo 2", "Trebuchet MS", sans-serif`
const sans = (px: number) => `700 ${px}px "Quicksand", "Trebuchet MS", sans-serif`

/** Fraction of the height kept clear at top and bottom on the vertical size. */
const SAFE_V = 0.12

type Geo = { w: number; h: number; pad: number; top: number; bottom: number; inner: number }

function geo(w: number, h: number, tall: boolean): Geo {
  const pad = 84
  const safe = tall ? h * SAFE_V : pad
  return { w, h, pad, top: safe, bottom: h - safe, inner: w - pad * 2 }
}

/** The dotted paper every slide sits on, so a deck reads as one set. */
function background(ctx: CanvasRenderingContext2D, g: Geo) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, g.w, g.h)
  ctx.fillStyle = 'rgba(255,138,101,.16)'
  for (let y = 40; y < g.h; y += 56) {
    for (let x = 40; x < g.w; x += 56) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Brand line, bottom left on every slide except the outro. */
function footer(ctx: CanvasRenderingContext2D, g: Geo) {
  ctx.font = sans(26)
  ctx.fillStyle = MUTED
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('kawaiikatz.com', g.pad, g.bottom - 6)
}

/** The swipe nudge, bottom right. Only on slides that have a next one. */
function swipe(ctx: CanvasRenderingContext2D, g: Geo) {
  ctx.font = display(28)
  ctx.fillStyle = CORAL
  const t = 'swipe →'
  ctx.fillText(t, g.w - g.pad - ctx.measureText(t).width, g.bottom - 6)
}

/**
 * The cover flows DOWN from an anchor near the top, rather than centring.
 *
 * Centring was the first version and it looked wrong for a reason worth
 * writing down: on 1080x1920 the bottom of the frame is where TikTok puts the
 * caption and Stories puts the reply bar, so vertically centred content leaves
 * a third of the slide empty at the top and then collides with an overlay at
 * the bottom. Anchoring high fills the part of the frame that is actually
 * visible, and the empty room lands where the platform wanted it anyway.
 */
function drawCover(ctx: CanvasRenderingContext2D, g: Geo, s: Extract<Slide, { kind: 'cover' }>) {
  let y = g.top + (g.bottom - g.top) * 0.1
  ctx.textBaseline = 'top'

  ctx.font = display(112)
  ctx.fillText(s.emoji, g.pad, y)
  y += 148

  ctx.fillStyle = PEACH
  roundRect(ctx, g.pad, y, 160, 12, 6)
  ctx.fill()
  y += 56

  const title = fitText(ctx, s.title, g.inner, 500, display, 92, 52)
  ctx.font = display(title.size)
  ctx.fillStyle = INK
  title.lines.forEach((l, i) => ctx.fillText(l, g.pad, y + i * title.lineHeight))
  y += title.lines.length * title.lineHeight + 52

  const hook = fitText(ctx, s.hook, g.inner, g.bottom - 90 - y, sans, 40, 26)
  ctx.font = sans(hook.size)
  ctx.fillStyle = MUTED
  hook.lines.forEach((l, i) => ctx.fillText(l, g.pad, y + i * hook.lineHeight))
}

function drawPoints(ctx: CanvasRenderingContext2D, g: Geo, s: Extract<Slide, { kind: 'points' }>) {
  // Same anchor as the cover and the quote, so a deck has one vertical rhythm.
  let y = g.top + (g.bottom - g.top) * 0.1
  ctx.textBaseline = 'top'

  if (s.heading) {
    const head = fitText(ctx, s.heading, g.inner, 220, display, 62, 40)
    ctx.font = display(head.size)
    ctx.fillStyle = INK
    head.lines.forEach((l, i) => ctx.fillText(l, g.pad, y + i * head.lineHeight))
    y += head.lines.length * head.lineHeight + 44
  }

  // The list shares whatever height is left, so a five-line slide and a
  // two-line slide are both centred in the space rather than both starting at
  // the top and one trailing off.
  const room = g.bottom - 70 - y
  const per = room / Math.max(1, s.lines.length)

  for (const line of s.lines) {
    const t = fitText(ctx, line, g.inner - 58, per - 18, sans, 38, 24)
    ctx.fillStyle = CORAL
    ctx.font = display(t.size)
    ctx.fillText('•', g.pad, y + 2)
    ctx.fillStyle = INK
    ctx.font = sans(t.size)
    t.lines.forEach((l, i) => ctx.fillText(l, g.pad + 46, y + i * t.lineHeight))
    y += Math.max(t.lines.length * t.lineHeight + 26, per)
  }
}

/**
 * A single idea, set large, flowing down from the heading.
 *
 * Not centred, for the same reason the cover is not: a short paragraph centred
 * on a 1920-tall canvas sits in the middle of an otherwise empty slide with its
 * own heading stranded at the top, which reads as a layout that failed rather
 * than one that chose.
 */
function drawQuote(ctx: CanvasRenderingContext2D, g: Geo, s: Extract<Slide, { kind: 'quote' }>) {
  let y = g.top + (g.bottom - g.top) * 0.1
  ctx.textBaseline = 'top'

  if (s.heading) {
    ctx.font = display(38)
    ctx.fillStyle = BLUE
    ctx.fillText(s.heading.toUpperCase(), g.pad, y)
    y += 82
  }

  const t = fitText(ctx, s.text, g.inner, g.bottom - 90 - y, sans, 54, 30)
  ctx.font = sans(t.size)
  ctx.fillStyle = INK
  t.lines.forEach((l, i) => ctx.fillText(l, g.pad, y + i * t.lineHeight))
}

function drawProduct(
  ctx: CanvasRenderingContext2D,
  g: Geo,
  s: Extract<Slide, { kind: 'product' }>,
  img?: HTMLImageElement
) {
  const boxW = g.inner
  const boxH = Math.min(boxW, g.bottom - g.top - 340)
  const bx = g.pad
  const by = g.top + 30

  ctx.save()
  roundRect(ctx, bx, by, boxW, boxH, 40)
  ctx.clip()
  ctx.fillStyle = LILAC
  ctx.fillRect(bx, by, boxW, boxH)
  if (img) cover(ctx, img, bx, by, boxW, boxH)
  ctx.restore()

  ctx.strokeStyle = PEACH
  ctx.lineWidth = 8
  roundRect(ctx, bx, by, boxW, boxH, 40)
  ctx.stroke()

  if (s.badge) {
    ctx.fillStyle = PINK
    roundRect(ctx, bx + 26, by + 26, 168, 68, 34)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 6
    roundRect(ctx, bx + 26, by + 26, 168, 68, 34)
    ctx.stroke()
    ctx.font = display(42)
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.badge, bx + 26 + (168 - ctx.measureText(s.badge).width) / 2, by + 62)
  }

  let y = by + boxH + 40
  ctx.textBaseline = 'top'

  ctx.font = sans(30)
  ctx.fillStyle = BLUE
  ctx.fillText(s.vendor.toUpperCase(), g.pad, y)
  y += 44

  const name = fitText(ctx, s.name, g.inner, 170, display, 56, 34)
  ctx.font = display(name.size)
  ctx.fillStyle = INK
  name.lines.forEach((l, i) => ctx.fillText(l, g.pad, y + i * name.lineHeight))
  y += name.lines.length * name.lineHeight + 14

  ctx.font = display(64)
  ctx.fillStyle = CORAL
  ctx.fillText(s.price, g.pad, y)
}

function drawOutro(ctx: CanvasRenderingContext2D, g: Geo, s: Extract<Slide, { kind: 'outro' }>) {
  const cy = (g.top + g.bottom) / 2
  ctx.textBaseline = 'middle'

  ctx.font = display(130)
  const marks = '🐱 🐼'
  ctx.fillText(marks, (g.w - ctx.measureText(marks).width) / 2, cy - 230)

  ctx.font = display(78)
  ctx.fillStyle = INK
  const brand = 'Kawaii Katz'
  ctx.fillText(brand, (g.w - ctx.measureText(brand).width) / 2, cy - 90)

  const t = fitText(ctx, s.line, g.inner, 300, sans, 44, 28)
  ctx.font = sans(t.size)
  ctx.fillStyle = MUTED
  t.lines.forEach((l, i) =>
    ctx.fillText(l, (g.w - ctx.measureText(l).width) / 2, cy + 20 + i * t.lineHeight)
  )

  ctx.fillStyle = PEACH
  const pillW = 460
  roundRect(ctx, (g.w - pillW) / 2, cy + 190, pillW, 96, 48)
  ctx.fill()
  ctx.font = display(44)
  ctx.fillStyle = INK
  const cta = 'link in bio'
  ctx.fillText(cta, (g.w - ctx.measureText(cta).width) / 2, cy + 238)
}

/** Draws one slide. Synchronous, so it can never half-render. */
export function drawSlide(
  canvas: HTMLCanvasElement,
  slide: Slide,
  size: SizeKey,
  opts: { img?: HTMLImageElement; isLast: boolean }
): void {
  const { w, h } = SIZES[size]
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const g = geo(w, h, size === 'vertical')

  background(ctx, g)
  ctx.fillStyle = INK

  switch (slide.kind) {
    case 'cover': drawCover(ctx, g, slide); break
    case 'points': drawPoints(ctx, g, slide); break
    case 'quote': drawQuote(ctx, g, slide); break
    case 'product': drawProduct(ctx, g, slide, opts.img); break
    case 'outro': drawOutro(ctx, g, slide); break
  }

  if (slide.kind !== 'outro') {
    footer(ctx, g)
    if (!opts.isLast) swipe(ctx, g)
  }
}

/** Decodes every product image a deck needs, keyed by slide index. */
export async function loadDeckImages(deck: Deck): Promise<Record<number, HTMLImageElement>> {
  const out: Record<number, HTMLImageElement> = {}
  await Promise.all(
    deck.slides.map(async (s, i) => {
      if (s.kind !== 'product' || !s.image) return
      // A single missing image must not take the deck down: that slide falls
      // back to the lilac panel and the rest still export.
      try { out[i] = await loadImage(s.image) } catch { /* skip */ }
    })
  )
  return out
}

export { wrapText }
