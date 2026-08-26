/**
 * Canvas primitives shared by anything that renders a social image.
 *
 * These started life inside lib/comic-render.ts. They are lifted out because
 * the carousel exporter needs the same four operations and the comic strip is
 * no longer the thing this site posts. comic-render.ts keeps its own copies
 * rather than importing from here, deliberately: it is on its way out, and a
 * dependency pointing at it would have to be unpicked when it goes.
 */

/**
 * Load an image for drawing into a canvas.
 *
 * -----------------------------------------------------------------------------
 * THE PROXIED URL IS THE RIGHT ONE HERE, WHICH IS THE OPPOSITE OF THE RSS RULE
 *
 * Section 4f says: if you are writing a URL for something OUTSIDE this site to
 * fetch, call unproxied(), because robots.txt disallows /api/ and Pinterest
 * cannot follow it. That rule has been learned three times and it is correct.
 *
 * It is also exactly backwards for canvas. Here WE are the fetcher, from our
 * own origin, and what matters is not robots.txt but CORS: drawing a remote
 * image whose host does not send permissive headers taints the canvas, and
 * toBlob() then throws a SecurityError. The failure lands at export time, after
 * the operator has laid out ten slides, which is the worst possible moment.
 *
 * `Product.image` is an /api/img path, so it is same-origin and can never taint
 * anything. Use the proxied URL for canvas and the un-proxied one for feeds.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })
}

/** Greedy word wrap. Returns the lines that fit `maxWidth` at the current font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

/**
 * Wrap text, shrinking the font until it fits a box.
 *
 * A slide has a fixed height and the text comes from an article nobody wrote
 * for a slide, so overflow is the normal case rather than the exception.
 * Shrinking is better than clipping: a slightly small line is readable and a
 * clipped one is a mistake anyone can see.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  font: (size: number) => string,
  start: number,
  min = 22
): { lines: string[]; size: number; lineHeight: number } {
  let size = start
  for (;;) {
    ctx.font = font(size)
    const lines = wrapText(ctx, text, maxWidth)
    const lineHeight = size * 1.3
    if (lines.length * lineHeight <= maxHeight || size <= min) return { lines, size, lineHeight }
    size -= 2
  }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Cover-fit an image into a box. Letterboxing on a social slide reads as a bug. */
export function cover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  px: number,
  py: number,
  pw: number,
  ph: number
) {
  const r = Math.max(pw / img.width, ph / img.height)
  const w = img.width * r
  const h = img.height * r
  ctx.save()
  ctx.beginPath()
  ctx.rect(px, py, pw, ph)
  ctx.clip()
  ctx.drawImage(img, px + (pw - w) / 2, py + (ph - h) / 2, w, h)
  ctx.restore()
}

export function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('the canvas produced no blob'))),
      'image/png'
    )
  })
}
