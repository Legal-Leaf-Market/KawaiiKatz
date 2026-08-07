// Server-side full-body (adult) model detection for apparel & accessories photos.
//
// Ported from the original storefront's coco-ssd scan. A product photo is flagged
// when coco-ssd detects a `person` whose bounding box is tall AND wide enough to be
// a standing model — a small crop (a face, a hand, feet in shoes, a doll) stays.
//
// Thresholds are the original's, tuned for a children's storefront:
//   PERSON_MIN   0.50  — min detection confidence for the `person` class
//   PERSON_BODY_H 0.45 — box height / image height to count as a body
//   PERSON_BODY_W 0.15 — box width  / image width  to count as a body
//
// Verdicts are cached in-process keyed by the ORIGINAL image URL, so sibling
// colourways sharing a photo resolve once and warm instances never re-scan.

import * as tf from '@tensorflow/tfjs'
import type { ObjectDetection } from '@tensorflow-models/coco-ssd'
import sharp from 'sharp'

const PERSON_MIN = 0.5
const PERSON_BODY_H = 0.45
const PERSON_BODY_W = 0.15
const SCAN_IMG_WIDTH = 512
const PER_IMAGE_TIMEOUT_MS = 8000

// verdict cache: true = has full-body model (exclude), false = clean
const verdictCache = new Map<string, boolean>()

let modelPromise: Promise<ObjectDetection> | null = null
async function getModel(): Promise<ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.setBackend('cpu')
      await tf.ready()
      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      return cocoSsd.load({ base: 'lite_mobilenet_v2' })
    })()
  }
  return modelPromise
}

// The product `image` field is proxied as /api/img?u=<encoded>. Recover the
// original CDN URL so we can fetch it directly for scanning.
function originalUrl(image: string): string {
  const m = image.match(/[?&]u=([^&]+)/)
  const raw = m ? decodeURIComponent(m[1]) : image
  if (!/^https?:\/\//i.test(raw)) return raw
  if (/cdn\.shopify\.com|\/cdn\/shop\//i.test(raw) && !/[?&]width=/.test(raw)) {
    return raw + (raw.includes('?') ? '&' : '?') + 'width=' + SCAN_IMG_WIDTH
  }
  return raw
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

async function detectBodyModel(image: string): Promise<boolean> {
  const url = originalUrl(image)
  const res = await withTimeout(
    fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' } }),
    PER_IMAGE_TIMEOUT_MS
  )
  if (!res.ok) throw new Error('http ' + res.status)
  const buf = Buffer.from(await res.arrayBuffer())

  // Decode + downscale to raw RGB. Resizing here caps decode cost and normalizes
  // odd formats (webp/avif) that the tensor path can't read directly.
  const { data, info } = await sharp(buf)
    .resize({ width: SCAN_IMG_WIDTH, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const model = await getModel()
  const input = tf.tensor3d(new Uint8Array(data), [height, width, 3])
  try {
    const preds = await model.detect(input, 20)
    return preds.some(
      (p) =>
        p.class === 'person' &&
        p.score >= PERSON_MIN &&
        p.bbox[3] / height >= PERSON_BODY_H &&
        p.bbox[2] / width >= PERSON_BODY_W
    )
  } finally {
    input.dispose()
  }
}

/** Cached single-image verdict. Fails OPEN (returns false = keep) on any error,
 *  so a flaky network can't wipe the catalog — the text filter is the backstop. */
export async function hasFullBodyModel(image: string): Promise<boolean> {
  if (!image) return false
  const key = originalUrl(image)
  const cached = verdictCache.get(key)
  if (cached !== undefined) return cached
  try {
    const verdict = await detectBodyModel(image)
    verdictCache.set(key, verdict)
    return verdict
  } catch {
    verdictCache.set(key, false) // remember the miss so we don't retry every load
    return false
  }
}

/**
 * Scan many images with a concurrency pool and a global wall-clock budget.
 * Returns a Set of images that contain a full-body model. Anything not reached
 * within the budget is simply omitted (kept), and picked up on a later load once
 * the in-process cache has more headroom.
 */
export async function scanForBodyModels(
  images: string[],
  opts: { concurrency?: number; budgetMs?: number } = {}
): Promise<Set<string>> {
  const concurrency = opts.concurrency ?? 3
  const deadline = Date.now() + (opts.budgetMs ?? 45000)
  const flagged = new Set<string>()

  // Unique, and cached ones resolved for free first.
  const unique = [...new Set(images.filter(Boolean))]
  const todo: string[] = []
  for (const img of unique) {
    const key = originalUrl(img)
    const cached = verdictCache.get(key)
    if (cached === true) flagged.add(img)
    else if (cached === undefined) todo.push(img)
  }

  let i = 0
  async function worker() {
    while (i < todo.length && Date.now() < deadline) {
      const img = todo[i++]
      const verdict = await hasFullBodyModel(img)
      if (verdict) flagged.add(img)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return flagged
}
