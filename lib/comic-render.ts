import {
  CORAL,
  IG_H,
  IG_W,
  INK,
  MAX_UPLOAD_PX,
  PANEL_BGS,
  PAPER,
  SCALE_FRACTION,
  grid,
  type Panel,
  type Strip,
} from './comic'

/**
 * Draws a strip onto a canvas at Instagram's 1080x1350.
 *
 * -----------------------------------------------------------------------------
 * WHY CANVAS AND NOT AN SVG foreignObject
 *
 * The sister site's IG studio rasterises HTML by serialising it into an SVG
 * <foreignObject> and drawing that into a canvas. It is a good trick for a
 * text-only slide and it cannot do this job: images inside a foreignObject are
 * not fetched when the SVG is loaded from a data: URL, so every mascot and every
 * dropped-in panel would come out blank. Not slow — blank, and silently.
 *
 * Drawing directly means laying the text out by hand, which is the cost paid in
 * wrapText() below. In exchange the pictures actually appear, and there is no
 * XML well-formedness failure mode where one unclosed tag yields a blank PNG.
 *
 * drawStrip is synchronous and takes decoded images, so it cannot half-render.
 * All loading happens in loadImage() first.
 */

export type StripArt = {
  cat: HTMLImageElement
  panda: HTMLImageElement
  /** Decoded uploads, keyed by panel index. */
  uploads: Record<number, HTMLImageElement>
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Harmless for the same-origin brand marks and for data URLs; it matters if
    // a panel image is ever pointed at another origin, because a canvas that has
    // drawn one without CORS headers is tainted and toBlob() then throws — the
    // strip would preview fine and fail only at download, the worst moment.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`could not load image`))
    img.src = src
  })
}

/**
 * Reads a file the user dropped in and returns a downscaled data URL.
 *
 * Downscaling is not an optimisation, it is what keeps drafts saveable: these
 * are stored in localStorage, and four untouched phone-sized PNGs exceed the
 * origin's whole quota. JPEG rather than PNG for the same reason — panel art is
 * photographic or painted, not flat colour, so PNG buys nothing here.
 */
export function fileToPanelImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('could not read that file'))
    reader.onload = async () => {
      try {
        const img = await loadImage(String(reader.result))
        const r = Math.min(1, MAX_UPLOAD_PX / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * r)
        c.height = Math.round(img.height * r)
        const ctx = c.getContext('2d')
        if (!ctx) return reject(new Error('no canvas context'))
        ctx.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.86))
      } catch (e) {
        reject(e as Error)
      }
    }
    reader.readAsDataURL(file)
  })
}

/** Greedy word wrap. Returns the lines that fit `maxWidth` at the current font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth || !line) line = test
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** A speech bubble with a tail. Returns the height used, so bubbles can stack. */
function bubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  tail: 'left' | 'right'
): number {
  const pad = 18
  const fs = 27
  ctx.font = `700 ${fs}px "Quicksand", "Trebuchet MS", sans-serif`
  const lines = wrapText(ctx, text, maxW - pad * 2)
  const lineH = fs * 1.28
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2)
  const h = lines.length * lineH + pad * 1.7

  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  roundRect(ctx, x, y, w, h, 20)
  ctx.fill()
  ctx.stroke()

  // Tail: filled first, then only its two outer edges re-stroked, so the
  // bubble's own outline does not show through where the tail joins it.
  const tx = tail === 'left' ? x + 34 : x + w - 34
  const dir = tail === 'left' ? -1 : 1
  ctx.beginPath()
  ctx.moveTo(tx, y + h - 2)
  ctx.lineTo(tx + dir * 26, y + h + 24)
  ctx.lineTo(tx + dir * 4, y + h - 2)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(tx, y + h - 1)
  ctx.lineTo(tx + dir * 26, y + h + 24)
  ctx.lineTo(tx + dir * 4, y + h - 1)
  ctx.strokeStyle = INK
  ctx.stroke()

  ctx.fillStyle = INK
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad * 0.8 + i * lineH))
  ctx.restore()
  return h
}

/** One brand mark, scaled to the panel and facing inward. */
function mark(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  px: number,
  py: number,
  pw: number,
  ph: number,
  placement: 'left' | 'right' | 'center',
  scale: number
) {
  const size = ph * scale
  const cx = placement === 'left' ? px + pw * 0.26 : placement === 'right' ? px + pw * 0.74 : px + pw / 2
  const x = cx - size / 2
  // Bottom-aligned rather than centred, so marks at different scales sit on one
  // line instead of each floating in the middle of its own box.
  const y = py + ph - size - ph * 0.06

  ctx.save()
  if (placement === 'right') {
    // Mirrored. Currently a no-op to look at — both brand marks are
    // front-facing heads, so flipping one changes nothing you can see. It is
    // here because it is free and because the day the art becomes
    // three-quarter or full-body, a right-hand character facing off the edge of
    // the panel is the first thing that will look wrong.
    ctx.translate(x + size / 2, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(img, -size / 2, y, size, size)
  } else {
    ctx.drawImage(img, x, y, size, size)
  }
  ctx.restore()
}

/** An uploaded panel image, cover-fitted. Letterboxing would read as a bug. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, px: number, py: number, pw: number, ph: number) {
  const r = Math.max(pw / img.width, ph / img.height)
  const w = img.width * r
  const h = img.height * r
  ctx.drawImage(img, px + (pw - w) / 2, py + (ph - h) / 2, w, h)
}

function panel(
  ctx: CanvasRenderingContext2D,
  p: Panel,
  art: StripArt,
  i: number,
  px: number,
  py: number,
  pw: number,
  ph: number
) {
  ctx.save()
  roundRect(ctx, px, py, pw, ph, 26)
  ctx.clip()

  const upload = art.uploads[i]
  if (p.art === 'upload' && upload) {
    cover(ctx, upload, px, py, pw, ph)
  } else {
    ctx.fillStyle = PANEL_BGS[i % PANEL_BGS.length]
    ctx.fillRect(px, py, pw, ph)
    const s = SCALE_FRACTION[p.scale]
    if (p.art === 'both') {
      // Two marks in one panel get 78% of the nominal scale. At the same size
      // as a solo character they collide at 'mid' and overlap badly at 'near' —
      // the placements are 26% and 74% of the panel width, so a mark taller
      // than about half the panel is already wider than the gap between them.
      const two = s * 0.78
      mark(ctx, art.cat, px, py, pw, ph, 'left', two)
      mark(ctx, art.panda, px, py, pw, ph, 'right', two)
    } else if (p.art === 'cat') {
      mark(ctx, art.cat, px, py, pw, ph, p.placement, s)
    } else if (p.art === 'panda') {
      mark(ctx, art.panda, px, py, pw, ph, p.placement, s)
    }
  }

  let top = py + 20
  if (p.caption) {
    ctx.font = '800 24px "Quicksand", "Trebuchet MS", sans-serif'
    const lines = wrapText(ctx, p.caption, pw - 60)
    const h = lines.length * 30 + 20
    ctx.fillStyle = 'rgba(255,250,240,.94)'
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    roundRect(ctx, px + 18, top, pw - 36, h, 12)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.textBaseline = 'top'
    lines.forEach((l, j) => ctx.fillText(l, px + 34, top + 12 + j * 30))
    top += h + 14
  }

  const maxW = pw * 0.62
  if (p.cat) top += bubble(ctx, p.cat, px + 22, top, maxW, 'left') + 30
  if (p.panda) bubble(ctx, p.panda, px + pw - maxW - 22, top, maxW, 'right')

  ctx.restore()

  ctx.strokeStyle = INK
  ctx.lineWidth = 5
  roundRect(ctx, px, py, pw, ph, 26)
  ctx.stroke()
}

/** Draws the whole strip. Synchronous — every image is already decoded. */
export function drawStrip(canvas: HTMLCanvasElement, strip: Strip, art: StripArt): void {
  canvas.width = IG_W
  canvas.height = IG_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, IG_W, IG_H)

  const pad = 34
  const footer = 86
  const { cols, rows } = grid(strip.panels.length)
  const gap = 20
  const gw = (IG_W - pad * 2 - gap * (cols - 1)) / cols
  const gh = (IG_H - pad * 2 - footer - gap * (rows - 1)) / rows

  strip.panels.forEach((p, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    panel(ctx, p, art, i, pad + c * (gw + gap), pad + r * (gh + gap), gw, gh)
  })

  // Footer, so a screenshotted strip still says where it came from.
  ctx.font = '800 30px "Baloo 2", "Trebuchet MS", sans-serif'
  ctx.fillStyle = INK
  ctx.textBaseline = 'middle'
  ctx.fillText('Kawaii Katz', pad + 4, IG_H - footer / 2 - 4)
  ctx.font = '700 24px "Quicksand", "Trebuchet MS", sans-serif'
  ctx.fillStyle = CORAL
  const handle = 'kawaiikatz.com'
  ctx.fillText(handle, IG_W - pad - ctx.measureText(handle).width - 4, IG_H - footer / 2 - 4)
}

/** The finished strip as a PNG blob, ready to download. */
export function stripToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('the canvas produced no blob'))),
      'image/png'
    )
  })
}
