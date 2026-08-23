/**
 * Render every icon and brand asset.
 *
 *   node scripts/mkicons.mjs     (or: pnpm icons)
 *
 * TWO MODES, chosen by what is on disk.
 *
 * ARTWORK MODE — used when assets/logo-cat.png and assets/logo-panda.png both
 * exist. Those are the real illustrated marks and everything is cut from them.
 * This is the mode we want; drop new artwork in with those names and re-run.
 *
 * VECTOR MODE — the fallback, from assets/icon.svg and assets/icon-small.svg.
 * Kept so the build is never broken by a missing file, and so the repo still
 * has a working icon set if the artwork is ever pulled.
 *
 * WHY TWO SOURCE IMAGES RATHER THAN ONE PAIR. The pair is what belongs on a
 * home screen; a browser tab is 16 pixels and two faces in it are two grey
 * blobs — measured, not assumed. Having the cat and the panda as separate files
 * lets the small sizes use a tight crop of the cat alone, which is the only
 * version of this artwork that survives being that small. Same art, different
 * framing, which is what an icon set is.
 *
 * Artwork on a white background is keyed out automatically (`trim`), because
 * white corners behind fur look wrong on the pastel tile. Transparent PNG is
 * still better if you have it — keying leaves fur edges slightly rough.
 */
import sharp from 'sharp'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const p = (...a) => join(root, ...a)
const CAT = p('assets/logo-cat.png')
const PANDA = p('assets/logo-panda.png')
const ARTWORK = existsSync(CAT) && existsSync(PANDA)

const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffe9f3"/><stop offset="1" stop-color="#efe4ff"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/></svg>`
const ROUND = (s) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <rect width="${s}" height="${s}" rx="${Math.round(s * 0.2227)}" fill="#fff"/></svg>`)

/**
 * Make the artwork's white backdrop transparent, WITHOUT eating the panda.
 *
 * The obvious approach — "set every near-white pixel to alpha 0" — destroys
 * this artwork, because the panda's face is white. So is the cat's fangs, and
 * the highlights in both sets of eyes.
 *
 * Instead this floods inward from the border and only clears white that is
 * CONNECTED to the edge of the image. Both marks are drawn with a heavy black
 * outline all the way around, so the flood stops there and every interior white
 * survives. A 4-connected BFS is plenty; the outline has no gaps.
 *
 * `trim` still runs first, to crop the bounding box down before we walk pixels.
 * Art that is already transparent passes through untouched.
 */
async function clean(file) {
  let img = sharp(file)
  try {
    img = sharp(await img.trim({ threshold: 12 }).png().toBuffer())
  } catch {
    img = sharp(file)
  }
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = info
  const near = (i) => data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232
  const seen = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const px = y * w + x
    if (seen[px]) return
    seen[px] = 1
    if (near(px * ch)) stack.push(px)
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const px = stack.pop()
    data[px * ch + 3] = 0
    const x = px % w, y = (px / w) | 0
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  return sharp(data, { raw: { width: w, height: h, channels: ch } }).png().toBuffer()
}

/** Lay art onto the brand tile at `fill` of its width, then round the corners. */
async function onTile(art, size, fill, offsetY = 0) {
  const inner = Math.round(size * fill)
  const art2 = await sharp(art).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer()
  const m = await sharp(art2).metadata()
  const base = await sharp(Buffer.from(TILE)).resize(size, size).toBuffer()
  const composed = await sharp(base)
    .composite([{
      input: art2,
      left: Math.round((size - m.width) / 2),
      top: Math.round((size - m.height) / 2 + size * offsetY),
    }])
    .png()
    .toBuffer()
  return sharp(composed)
    .composite([{ input: ROUND(size), blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const write = (rel, buf) => {
  writeFileSync(p(rel), buf)
  console.log(`${rel.padEnd(26)} ${(buf.length / 1024).toFixed(1)}KB`)
}

mkdirSync(p('public'), { recursive: true })

if (ARTWORK) {
  console.log('artwork mode — building from assets/logo-*.png\n')
  const cat = await clean(CAT)
  const panda = await clean(PANDA)

  // The pair, cat slightly forward and lower, panda tucked behind to the right.
  const PW = 1024
  const catR = await sharp(cat).resize({ width: Math.round(PW * 0.58) }).toBuffer()
  const pandaR = await sharp(panda).resize({ width: Math.round(PW * 0.50) }).toBuffer()
  const cm = await sharp(catR).metadata()
  const pm = await sharp(pandaR).metadata()
  const pairArt = await sharp({
    create: { width: PW, height: PW, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: pandaR, left: Math.round(PW * 0.46), top: Math.round(PW / 2 - pm.height / 2 - PW * 0.05) },
      { input: catR, left: Math.round(PW * 0.02), top: Math.round(PW / 2 - cm.height / 2 + PW * 0.04) },
    ])
    .png()
    .toBuffer()

  write('app/icon.png', await onTile(pairArt, 1024, 0.9))
  write('public/apple-icon.png', await onTile(pairArt, 180, 0.9))
  write('public/icon-192.png', await onTile(pairArt, 192, 0.9))
  write('public/icon-512.png', await onTile(pairArt, 512, 0.9))
  // Small sizes: the cat alone, cropped tight. See the note at the top.
  write('public/icon-32.png', await onTile(cat, 32, 0.94))
  write('public/icon-16.png', await onTile(cat, 16, 0.98))

  // Header / footer marks: transparent, no tile, small enough to sit by text.
  for (const [rel, src] of [['public/brand-cat.png', cat], ['public/brand-panda.png', panda]]) {
    write(rel, await sharp(src).resize({ width: 128, height: 128, fit: 'inside' }).png({ compressionLevel: 9 }).toBuffer())
  }

  // The manifest and layout both reference /icon.svg. In artwork mode there is
  // no vector to serve, so it wraps the 256px raster — self-contained, and
  // small enough not to matter.
  const embed = (await onTile(pairArt, 256, 0.9)).toString('base64')
  write('public/icon.svg', Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">` +
    `<image href="data:image/png;base64,${embed}" width="256" height="256"/></svg>`))
} else {
  console.log(
    'No artwork found. Expected assets/logo-cat.png and assets/logo-panda.png.\n' +
    'Nothing was written — the icons currently in app/ and public/ are the\n' +
    "original Kawaii Katz cat, restored by hand. Drop the artwork in and re-run."
  )
}
