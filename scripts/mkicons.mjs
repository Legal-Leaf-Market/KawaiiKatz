/**
 * Render every icon asset from the two SVG sources in assets/.
 *
 *   node scripts/mkicons.mjs     (or: pnpm icons)
 *
 * WHY TWO SOURCES. assets/icon.svg is the full mark — the black cat and the
 * panda side by side. It is the brand, and it is what belongs on a home screen
 * or a social card. But two faces in a 16px browser tab collapse into two grey
 * blobs, which is a real cost and was measured rather than assumed.
 *
 * assets/icon-small.svg is the same pair redrawn for small sizes: no sparkles,
 * no background circle, both faces enlarged to fill the canvas, and a much
 * thicker outline on the panda so it survives being 16 pixels wide. Same
 * artwork, different amount of detail — which is what an icon set normally is.
 *
 * Anything under 48px renders from the small source, everything else from the
 * full one. Edit the SVGs, re-run this, commit the PNGs.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const full = readFileSync(join(root, 'assets/icon.svg'))
const small = readFileSync(join(root, 'assets/icon-small.svg'))

/** density high enough that the rasteriser is not the limiting factor. */
const png = (svg, size) => sharp(svg, { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer()

const targets = [
  // [output path, size, source]
  ['app/icon.png', 1024, full], // Next's file convention: favicon fallback AND the og:image referenced in layout
  ['public/apple-icon.png', 180, full], // iOS home screen
  ['public/icon-192.png', 192, full], // PWA
  ['public/icon-512.png', 512, full], // PWA / splash
  ['public/icon-32.png', 32, small], // browser tab
  ['public/icon-16.png', 16, small], // browser tab, smallest
]

mkdirSync(join(root, 'public'), { recursive: true })
for (const [out, size, src] of targets) {
  const buf = await png(src, size)
  writeFileSync(join(root, out), buf)
  console.log(`${out.padEnd(24)} ${String(size).padStart(4)}px  ${(buf.length / 1024).toFixed(1)}KB`)
}

// The manifest and the scalable favicon both point at /icon.svg, so the full
// source is copied out verbatim — vector, so it needs no rendering.
writeFileSync(join(root, 'public/icon.svg'), full)
console.log(`${'public/icon.svg'.padEnd(24)}  vector  ${(full.length / 1024).toFixed(1)}KB`)
