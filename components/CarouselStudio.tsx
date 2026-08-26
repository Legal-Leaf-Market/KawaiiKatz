'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ARTICLES } from '@/lib/articles'
import { BOARDS } from '@/lib/boards'
import { fillBoard } from '@/lib/boards'
import { SIZES, deckFromArticle, deckFromProducts, type Deck, type SizeKey } from '@/lib/carousel'
import { drawSlide, loadDeckImages } from '@/lib/carousel-render'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { toPng } from '@/lib/canvas-kit'
import type { Product } from '@/lib/data'

/**
 * The carousel studio: pick a source, get a deck of slides, download the PNGs.
 *
 * -----------------------------------------------------------------------------
 * WHAT THIS REPLACED AND WHY
 *
 * This page used to lay out cat-and-panda comic strips. That was killed because
 * every strip needed pictures generated elsewhere, which cost money per post and
 * ran out. The renderer survived it: a canvas that composites images and text at
 * a fixed social size does not care whether the subject is a panda or a plushie.
 *
 * The economics are the whole difference. A comic needed four new images per
 * post. A carousel needs zero, because 4,426 product photographs already exist
 * and the articles are already written. Cost per post went from real money to
 * nothing, which is why this one will still be here next month.
 *
 * -----------------------------------------------------------------------------
 * ONE DECK, FOUR PLATFORMS
 *
 * 1080x1350 is the Instagram feed. 1080x1920 is TikTok Photo Mode, Instagram
 * Stories and Lemon8. TikTok's own numbers put photo carousels well ahead of
 * video on engagement, and unlike video they need no trending audio, which the
 * API cannot attach anyway. So the same deck, exported twice, covers every
 * surface worth posting to.
 *
 * -----------------------------------------------------------------------------
 * DOWNLOADS ARE SEQUENTIAL, WITH A GAP
 *
 * Browsers throttle or silently drop a burst of programmatic downloads. Ten
 * slides fired in a loop reliably yields six files and no error. They go one at
 * a time with a short pause, and the button reports progress so a stall is
 * visible rather than mysterious.
 */

const INK = '#4f4550'
const MUTED = '#9a8fa3'
const LINE = '#ffe6d9'
const BLUE = '#6495ED'

type SourceKind = 'article' | 'guide' | 'fresh' | 'drops'

/** How many products a product deck carries. Instagram allows 20 slides. */
const PRODUCT_SLIDES = 8

export default function CarouselStudio() {
  const { products } = useLiveCatalog()
  const { excludedIds } = useExclusions()

  const [kind, setKind] = useState<SourceKind>('article')
  const [key, setKey] = useState<string>(ARTICLES[0]?.slug ?? '')
  const [size, setSize] = useState<SizeKey>('vertical')
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const live = useMemo(
    () => products.filter((p) => p.image && !excludedIds.has(p.id)),
    [products, excludedIds]
  )

  const deck: Deck | null = useMemo(() => {
    if (kind === 'article') {
      const a = ARTICLES.find((x) => x.slug === key)
      return a ? deckFromArticle(a) : null
    }
    if (kind === 'guide') {
      const b = BOARDS.find((x) => x.slug === key)
      if (!b || !live.length) return null
      const picks = fillBoard(b, live).flatMap((s) => s.products).slice(0, PRODUCT_SLIDES)
      if (!picks.length) return null
      return deckFromProducts(
        { slug: b.slug, emoji: b.emoji, title: b.title, hook: b.tagline, hashtags: [b.hashtag] },
        picks
      )
    }
    if (!live.length) return null
    const chosen: Product[] =
      kind === 'fresh'
        ? [...live].sort((a, b) => (a.added < b.added ? 1 : -1)).slice(0, PRODUCT_SLIDES)
        : live
            .filter((p) => p.onSale && p.discountPct >= 20)
            .sort((a, b) => b.discountPct - a.discountPct)
            .slice(0, PRODUCT_SLIDES)
    if (!chosen.length) return null
    return kind === 'fresh'
      ? deckFromProducts(
          {
            slug: 'kawaii-drop',
            emoji: '✨',
            title: 'Kawaii Drop',
            hook: 'The newest things across twelve shops this week.',
            hashtags: ['KawaiiFinds', 'NewIn', 'CuteThings'],
          },
          chosen
        )
      : deckFromProducts(
          {
            slug: 'price-drops',
            emoji: '🔻',
            title: 'Price drops',
            hook: '20% off or better, right now.',
            hashtags: ['KawaiiSale', 'CuteDeals', 'KawaiiFinds'],
          },
          chosen
        )
  }, [kind, key, live])

  const slide = deck?.slides[Math.min(index, (deck?.slides.length ?? 1) - 1)]

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !deck || !slide) return
    const i = Math.min(index, deck.slides.length - 1)
    let img: HTMLImageElement | undefined
    if (slide.kind === 'product') {
      const imgs = await loadDeckImages({ ...deck, slides: [slide] })
      img = imgs[0]
    }
    drawSlide(canvas, slide, size, { img, isLast: i === deck.slides.length - 1 })
  }, [deck, slide, index, size])

  useEffect(() => { void redraw() }, [redraw])
  useEffect(() => { setIndex(0) }, [kind, key])

  async function downloadAll() {
    if (!deck) return
    setNote(null)
    try {
      const imgs = await loadDeckImages(deck)
      const canvas = document.createElement('canvas')
      for (let i = 0; i < deck.slides.length; i++) {
        setBusy(`${i + 1} / ${deck.slides.length}`)
        drawSlide(canvas, deck.slides[i], size, {
          img: imgs[i],
          isLast: i === deck.slides.length - 1,
        })
        const blob = await toPng(canvas)
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${deck.slug}-${size}-${String(i + 1).padStart(2, '0')}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 8000)
        // The pause is what makes ten downloads arrive as ten files.
        await new Promise((r) => setTimeout(r, 350))
      }
      setNote(`${deck.slides.length} slides downloaded at ${SIZES[size].w}x${SIZES[size].h}.`)
    } catch (e) {
      setNote((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  function copyCaption() {
    if (!deck) return
    const tags = deck.hashtags.map((h) => `#${h}`).join(' ')
    // #ad leads. These posts point at affiliate links and the FTC does not care
    // that the disclosure is also on the website.
    void navigator.clipboard.writeText(`${deck.caption}\n\n#ad ${tags}`)
    setNote('Caption copied, #ad included.')
  }

  const options: { value: string; label: string }[] =
    kind === 'article'
      ? ARTICLES.map((a) => ({ value: a.slug, label: `${a.emoji} ${a.title}` }))
      : kind === 'guide'
        ? BOARDS.map((b) => ({ value: b.slug, label: `${b.emoji} ${b.title}` }))
        : []

  const btn =
    'border-[2.5px] font-display font-extrabold rounded-full px-3.5 py-1.5 text-[13px] transition-colors'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <div className="bg-white border-[3px] rounded-[22px] p-4 flex flex-col gap-3" style={{ borderColor: '#ffb199' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-extrabold text-[13px]" style={{ color: MUTED }}>Make a deck from</span>
            {([
              ['article', '📚 An article'],
              ['guide', '🎁 A gift guide'],
              ['fresh', '✨ Kawaii Drop'],
              ['drops', '🔻 Price drops'],
            ] as [SourceKind, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => {
                  setKind(k)
                  setKey(k === 'article' ? ARTICLES[0].slug : k === 'guide' ? BOARDS[0].slug : '')
                }}
                className={btn}
                style={
                  kind === k
                    ? { borderColor: BLUE, background: BLUE, color: '#fff' }
                    : { borderColor: LINE, background: '#fff', color: MUTED }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {options.length > 0 && (
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="border-2 rounded-[14px] px-3 py-2 text-[14px] font-semibold outline-none bg-white"
              style={{ borderColor: LINE, color: INK }}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-extrabold text-[13px]" style={{ color: MUTED }}>Size</span>
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSize(k)}
                className={btn}
                style={
                  size === k
                    ? { borderColor: BLUE, background: BLUE, color: '#fff' }
                    : { borderColor: LINE, background: '#fff', color: MUTED }
                }
              >
                {SIZES[k].w}×{SIZES[k].h}
              </button>
            ))}
            <span className="text-[12px] font-bold" style={{ color: MUTED }}>{SIZES[size].label}</span>
          </div>

          {note && <p className="text-[13px] font-bold" style={{ color: MUTED }}>{note}</p>}
        </div>

        {deck ? (
          <div className="bg-white border-[3px] rounded-[22px] p-4" style={{ borderColor: LINE }}>
            <p className="font-display font-extrabold text-[15px] mb-2" style={{ color: INK }}>
              {deck.slides.length} slides
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {deck.slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  title={s.kind}
                  className="border-2 font-display font-extrabold rounded-lg w-9 h-9 text-[12px] transition-colors"
                  style={
                    i === index
                      ? { borderColor: BLUE, background: BLUE, color: '#fff' }
                      : { borderColor: LINE, background: '#fff', color: MUTED }
                  }
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-[12.5px] font-semibold mt-2.5" style={{ color: MUTED }}>
              Slide {index + 1} is a <strong style={{ color: INK }}>{slide?.kind}</strong> slide.
              Instagram takes up to 20, TikTok more.
            </p>
          </div>
        ) : (
          <p className="text-[14px] font-bold" style={{ color: MUTED }}>
            Waiting for the catalogue, or nothing matched this source yet.
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-24 flex flex-col gap-3">
        <canvas
          ref={canvasRef}
          className="w-full rounded-[20px] border-[3px] shadow-[0_4px_12px_rgba(255,138,101,.18)]"
          style={{ borderColor: '#ffb199', background: '#fffaf0' }}
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadAll}
            disabled={!deck || busy !== null}
            className="flex-1 border-[3px] font-display font-extrabold px-4 py-2.5 rounded-full text-[14px] transition-colors disabled:opacity-40"
            style={{ borderColor: '#ff8a65', background: '#ffb199', color: INK }}
          >
            {busy ? `Saving ${busy}…` : `⬇ Download all ${deck?.slides.length ?? 0}`}
          </button>
          <button
            onClick={copyCaption}
            disabled={!deck}
            className="border-[3px] font-display font-extrabold px-4 py-2.5 rounded-full text-[14px] transition-colors disabled:opacity-40"
            style={{ borderColor: '#7fc4d4', background: '#fff', color: INK }}
          >
            Copy caption
          </button>
        </div>
        <p className="text-[12.5px] font-bold text-center" style={{ color: MUTED }}>
          Slides download in order, numbered, ready to upload as a carousel.
        </p>
      </div>
    </div>
  )
}
