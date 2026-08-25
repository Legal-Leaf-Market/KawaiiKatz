'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PANEL_COUNTS,
  emptyPanel,
  emptyStrip,
  type Art,
  type Panel,
  type Strip,
} from '@/lib/comic'
import { drawStrip, fileToPanelImage, loadImage, stripToPng, type StripArt } from '@/lib/comic-render'

/**
 * IG Studio: lay out a cat-and-panda strip, export the 1080x1350 PNG.
 *
 * No API key, no image generation, no network. Panel art is either the two
 * brand marks — posed and mirrored by the renderer, so the cat is the same cat
 * in every strip — or a picture drawn elsewhere and dropped in. What the studio
 * owns is the part that has to be identical across every post and is miserable
 * to redo by hand: the grid, the speech bubbles, the brand furniture and the
 * crop.
 *
 * Drafts live in localStorage under one key. Deliberately not on the server: a
 * strip is cheap to redo, and a drafts table is a schema, a migration and a
 * backup nobody asked for.
 */

const KEY = 'kk_comic_draft_v1'

export default function ComicStudio() {
  const [strip, setStrip] = useState<Strip>(() => emptyStrip(4))
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null)
  const [ready, setReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // After mount, never during render: localStorage is undefined on the server
  // and reading it in render is a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setStrip(JSON.parse(raw) as Strip)
    } catch { /* corrupt or blocked storage: start clean */ }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(KEY, JSON.stringify(strip))
    } catch {
      // Almost always QuotaExceededError from panel images. Say so, because the
      // alternative is a draft that silently stops saving.
      setNote({ text: 'Too big to save as a draft — the strip still exports fine.', bad: true })
    }
  }, [strip, ready])

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const [cat, panda] = await Promise.all([
        loadImage('/brand-cat.png'),
        loadImage('/brand-panda.png'),
      ])
      const uploads: Record<number, HTMLImageElement> = {}
      await Promise.all(
        strip.panels.map(async (p, i) => {
          if (p.art === 'upload' && p.image) {
            try { uploads[i] = await loadImage(p.image) } catch { /* skip a bad one */ }
          }
        })
      )
      drawStrip(canvas, strip, { cat, panda, uploads } as StripArt)
    } catch {
      setNote({ text: 'Could not load the brand marks.', bad: true })
    }
  }, [strip])

  useEffect(() => { void redraw() }, [redraw])

  function setPanel(i: number, patch: Partial<Panel>) {
    setStrip((s) => ({ ...s, panels: s.panels.map((p, j) => (j === i ? { ...p, ...patch } : p)) }))
  }

  function setCount(n: number) {
    setStrip((s) => {
      const panels = s.panels.slice(0, n)
      while (panels.length < n) panels.push(emptyPanel())
      return { ...s, panels }
    })
  }

  async function attach(i: number, file: File | undefined) {
    if (!file) return
    try {
      const image = await fileToPanelImage(file)
      setPanel(i, { art: 'upload', image })
      setNote(null)
    } catch {
      setNote({ text: 'Could not read that image.', bad: true })
    }
  }

  async function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const blob = await stripToPng(canvas)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${strip.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'strip'}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } catch (e) {
      setNote({ text: (e as Error).message, bad: true })
    }
  }

  function copyCaption() {
    const tags = strip.hashtags.map((h) => `#${h}`).join(' ')
    // #ad leads, because these posts point at affiliate links and the FTC does
    // not care that the disclosure was on the website instead.
    void navigator.clipboard.writeText(`${strip.caption}\n\n#ad ${tags}`)
    setNote({ text: 'Caption copied, #ad included.' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <div className="bg-white border-[3px] border-[#ffb199] rounded-[22px] p-4 flex flex-col gap-3">
          <input
            value={strip.title}
            onChange={(e) => setStrip((s) => ({ ...s, title: e.target.value }))}
            className="font-display font-extrabold text-[18px] text-[#4f4550] border-b-2 border-[#ffe6d9] focus:border-[#7fc4d4] outline-none pb-1"
            aria-label="Strip title"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-extrabold text-[13px] text-[#9a8fa3]">Panels</span>
            {PANEL_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`border-2 font-display font-extrabold rounded-full w-9 h-9 text-[13px] transition-colors ${
                  strip.panels.length === n
                    ? 'border-[#b79cff] bg-[#b79cff] text-white'
                    : 'border-[#e6dcff] bg-white text-[#b79cff] hover:bg-[#e6dcff]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {note && (
            <p className={`text-[13px] font-bold ${note.bad ? 'text-[#e0227a]' : 'text-[#9a8fa3]'}`}>{note.text}</p>
          )}
        </div>

        {strip.panels.map((p, i) => (
          <div key={i} className="bg-white border-[3px] border-[#ffe6d9] rounded-[18px] p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap text-[12px] font-extrabold text-[#9a8fa3]">
              <span className="font-display text-[13px] text-[#4f4550]">Panel {i + 1}</span>
              <select
                value={p.art}
                onChange={(e) => setPanel(i, { art: e.target.value as Art })}
                className="border-2 border-[#ffe6d9] rounded-full px-2.5 py-1 outline-none bg-white"
              >
                <option value="both">cat + panda</option>
                <option value="cat">cat only</option>
                <option value="panda">panda only</option>
                <option value="none">empty</option>
                <option value="upload">my own picture</option>
              </select>

              {p.art !== 'upload' && p.art !== 'none' && p.art !== 'both' && (
                <select
                  value={p.placement}
                  onChange={(e) => setPanel(i, { placement: e.target.value as Panel['placement'] })}
                  className="border-2 border-[#ffe6d9] rounded-full px-2.5 py-1 outline-none bg-white"
                >
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              )}
              {p.art !== 'upload' && p.art !== 'none' && (
                <select
                  value={p.scale}
                  onChange={(e) => setPanel(i, { scale: e.target.value as Panel['scale'] })}
                  className="border-2 border-[#ffe6d9] rounded-full px-2.5 py-1 outline-none bg-white"
                >
                  <option value="far">far</option>
                  <option value="mid">mid</option>
                  <option value="near">near</option>
                  <option value="huge">huge</option>
                </select>
              )}

              <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer border-2 border-[#7fc4d4] text-[#4f4550] rounded-full px-2.5 py-1 hover:bg-[#bfe3ea] transition-colors">
                {p.image ? 'replace picture' : 'drop a picture'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void attach(i, e.target.files?.[0])}
                />
              </label>
              {p.image && (
                <button
                  onClick={() => setPanel(i, { art: 'both', image: undefined })}
                  className="underline hover:text-[#ff8a65]"
                >
                  remove
                </button>
              )}
            </div>

            <input
              value={p.caption ?? ''}
              onChange={(e) => setPanel(i, { caption: e.target.value })}
              placeholder="narration box (optional)"
              className="border-2 border-[#ffe6d9] focus:border-[#7fc4d4] rounded-xl px-3 py-1.5 text-[13.5px] outline-none"
            />
            <input
              value={p.cat ?? ''}
              onChange={(e) => setPanel(i, { cat: e.target.value })}
              placeholder="left bubble — the cat"
              className="border-2 border-[#ffe6d9] focus:border-[#7fc4d4] rounded-xl px-3 py-1.5 text-[13.5px] outline-none"
            />
            <input
              value={p.panda ?? ''}
              onChange={(e) => setPanel(i, { panda: e.target.value })}
              placeholder="right bubble — the panda"
              className="border-2 border-[#ffe6d9] focus:border-[#7fc4d4] rounded-xl px-3 py-1.5 text-[13.5px] outline-none"
            />
          </div>
        ))}

        <div className="bg-white border-[3px] border-[#ffb199] rounded-[22px] p-4 flex flex-col gap-2.5">
          <label className="font-display font-extrabold text-[15px] text-[#4f4550]">Instagram caption</label>
          <textarea
            value={strip.caption}
            onChange={(e) => setStrip((s) => ({ ...s, caption: e.target.value }))}
            rows={3}
            className="border-2 border-[#ffe6d9] focus:border-[#7fc4d4] rounded-[14px] px-3 py-2 text-[13.5px] outline-none resize-y"
          />
          <input
            value={strip.hashtags.join(' ')}
            onChange={(e) =>
              setStrip((s) => ({
                ...s,
                hashtags: e.target.value.split(/[\s,#]+/).map((h) => h.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean),
              }))
            }
            placeholder="hashtags, space separated, no #"
            className="border-2 border-[#ffe6d9] focus:border-[#7fc4d4] rounded-xl px-3 py-1.5 text-[13px] outline-none"
          />
          <p className="text-[12px] font-bold text-[#9a8fa3]">
            #ad {strip.hashtags.map((h) => `#${h}`).join(' ')}
          </p>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 flex flex-col gap-3">
        <canvas
          ref={canvasRef}
          className="w-full rounded-[20px] border-[3px] border-[#ffb199] bg-[#fffaf0] shadow-[0_4px_12px_rgba(255,138,101,.18)]"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={download}
            className="flex-1 border-[3px] border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold px-4 py-2.5 rounded-full text-[14px] hover:bg-[#ff8a65] hover:text-white transition-colors"
          >
            ⬇ Download PNG
          </button>
          <button
            onClick={copyCaption}
            className="border-[3px] border-[#7fc4d4] bg-white text-[#4f4550] font-display font-extrabold px-4 py-2.5 rounded-full text-[14px] hover:bg-[#bfe3ea] transition-colors"
          >
            Copy caption
          </button>
          <button
            onClick={() => { setStrip(emptyStrip(4)); setNote(null) }}
            className="text-[12.5px] font-bold text-[#9a8fa3] underline hover:text-[#ff8a65] px-2"
          >
            start over
          </button>
        </div>
        <p className="text-[12.5px] font-bold text-[#9a8fa3] text-center">
          1080×1350 — Instagram&apos;s portrait slot.
        </p>
      </div>
    </div>
  )
}
