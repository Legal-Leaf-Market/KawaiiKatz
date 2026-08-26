'use client'
import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

/**
 * The comment thread on a product page.
 *
 * -----------------------------------------------------------------------------
 * CLIENT-FETCHED, AND IT HAS TO BE
 *
 * /p/<id> is prerendered and cached for six hours (§4b). A thread rendered on
 * the server would be up to six hours stale — someone would post a comment,
 * reload, and not see it, which reads as "the site ate my comment" rather than
 * "the page is cached". Same reason the exclusion list is fetched rather than
 * baked in.
 *
 * -----------------------------------------------------------------------------
 * ONE LEVEL OF REPLIES
 *
 * The depth is clamped server-side, not here: a reply to a reply attaches to
 * the same parent. Arbitrary nesting is unreadable by the third indent on a
 * phone, and clamping it in CSS instead would give threads a shape that depends
 * on which component happens to render them.
 */

type Comment = {
  id: string
  parentId: string | null
  author: string
  body: string
  hidden: boolean
  createdAt: string
  hiddenBody?: string
  hiddenAuthor?: string
}

const NAME_KEY = 'kk_comment_name'

function when(iso: string): string {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`
  return d.toLocaleDateString()
}

export default function ProductComments({ productId }: { productId: string }) {
  const { state } = useStore()
  const curator = state.adaMode
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/comments?product=${encodeURIComponent(productId)}`)
      const j = await r.json()
      setComments(Array.isArray(j.comments) ? j.comments : [])
    } catch {
      setComments([])
    } finally {
      setLoaded(true)
    }
  }, [productId])

  useEffect(() => { void load() }, [load])

  // Remember the name, not the comment. Saves retyping without keeping a draft
  // of something the person may have decided not to say.
  useEffect(() => {
    try { setAuthor(localStorage.getItem(NAME_KEY) ?? '') } catch { /* blocked storage */ }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!author.trim() || !body.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, parentId: replyTo, author, body }),
      })
      const j = await r.json()
      if (!r.ok) {
        setErr(j.error ?? 'could not post that')
      } else {
        try { localStorage.setItem(NAME_KEY, author.trim()) } catch { /* ignore */ }
        setBody('')
        setReplyTo(null)
        await load()
      }
    } catch {
      setErr('network error')
    } finally {
      setBusy(false)
    }
  }

  async function setHidden(id: string, hidden: boolean) {
    await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hidden }),
    })
    await load()
  }

  const tops = comments.filter((c) => !c.parentId)
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id)

  function Row({ c, reply }: { c: Comment; reply?: boolean }) {
    return (
      <div className={`${reply ? 'ml-6 sm:ml-10 border-l-[3px] border-[#ffe6d9] pl-3.5' : ''} py-2.5`}>
        {c.hidden && !curator ? (
          <p className="text-[13px] font-bold text-[#c4bccb] italic">removed by the curator</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display font-extrabold text-[14px] text-[#4f4550]">
                {c.hidden ? c.hiddenAuthor : c.author}
              </span>
              <span className="text-[11.5px] font-bold text-[#9a8fa3]">{when(c.createdAt)}</span>
              {c.hidden && (
                <span className="text-[10.5px] font-extrabold uppercase tracking-[.5px] text-[#e0227a]">hidden</span>
              )}
            </div>
            <p className="text-[14px] text-[#4f4550] leading-relaxed whitespace-pre-wrap mt-0.5">
              {c.hidden ? c.hiddenBody : c.body}
            </p>
          </>
        )}
        <div className="flex gap-3 mt-1">
          {!reply && !c.hidden && (
            <button
              onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
              className="text-[12px] font-bold text-[#9a8fa3] hover:text-[#ff8a65] underline"
            >
              {replyTo === c.id ? 'cancel' : 'reply'}
            </button>
          )}
          {curator && (
            <button
              onClick={() => void setHidden(c.id, !c.hidden)}
              className="text-[12px] font-bold text-[#b79cff] hover:text-[#ff5a7a] underline"
            >
              {c.hidden ? 'restore' : 'hide'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="mt-10 max-w-[68ch]">
      <h2 className="font-display font-extrabold text-[19px] text-[#4f4550] mb-1">
        Comments{comments.length > 0 && <span className="text-[#9a8fa3]"> · {comments.length}</span>}
      </h2>
      <p className="text-[12.5px] text-[#9a8fa3] font-semibold mb-4">
        Say what you think of this one. No account needed. Links aren&apos;t allowed, and the
        curator can remove anything.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-2 mb-5">
        {replyTo && (
          <p className="text-[12.5px] font-bold text-[#b79cff]">
            Replying ·{' '}
            <button type="button" onClick={() => setReplyTo(null)} className="underline">cancel</button>
          </p>
        )}
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          className="border-[2.5px] border-[#ffe6d9] focus:border-[#7fc4d4] rounded-full px-4 py-2 font-sans font-semibold text-[14px] outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyTo ? 'Your reply…' : 'Your comment…'}
          rows={3}
          maxLength={1200}
          className="border-[2.5px] border-[#ffe6d9] focus:border-[#7fc4d4] rounded-[16px] px-3.5 py-2.5 font-sans font-semibold text-[14px] outline-none resize-y"
        />
        {err && <p className="text-[13px] font-bold text-[#e0227a]">{err}</p>}
        <button
          type="submit"
          disabled={busy || !author.trim() || !body.trim()}
          className="self-start border-[3px] border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold px-5 py-2 rounded-full text-[14px] hover:bg-[#ff8a65] hover:text-white transition-colors disabled:opacity-40"
        >
          {busy ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
        </button>
      </form>

      {!loaded ? null : tops.length === 0 ? (
        <p className="text-[13.5px] font-bold text-[#9a8fa3]">Nothing here yet. Be the first.</p>
      ) : (
        <div className="divide-y-2 divide-[#ffe6d9]">
          {tops.map((c) => (
            <div key={c.id}>
              <Row c={c} />
              {repliesOf(c.id).map((r) => (
                <Row key={r.id} c={r} reply />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
