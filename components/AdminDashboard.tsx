'use client'
import { useCallback, useEffect, useState } from 'react'

/**
 * The curator's read on what the site is doing.
 *
 * -----------------------------------------------------------------------------
 * EVERY CHART HERE IS ONE SERIES, AND THAT IS DELIBERATE
 *
 * Ranked bars and funnel steps are magnitude-by-identity: one measure, many
 * rows. One measure means one hue, no legend, and no second axis. The temptation
 * on a page like this is to put views and clicks on the same bar so nothing is
 * "wasted", which produces a two-scale chart where a long bar means different
 * things in different rows. Views are shown as a plain number in the row
 * instead, and the bar always means the same thing: clicks out to a vendor.
 *
 * Colour carries no information anywhere on this page. It is one accent for
 * every bar, because rank is already encoded by position and repeating it in
 * colour would make a filter that reorders the list repaint every row.
 *
 * -----------------------------------------------------------------------------
 * THE CEILING ON EVERY NUMBER
 *
 * We never take payment, so nothing here is sales. The furthest we can see is
 * the moment someone reaches a shop. "Popular" means most clicked on this site,
 * and the banner says so, because a dashboard that lets its reader assume
 * otherwise is worse than no dashboard.
 *
 * That ceiling is a limit on what we KNOW, not a limit on what is good. An
 * outbound click is the only event on this site that can earn anything, so it
 * is the goal of every funnel here and is drawn as one. The page previously
 * annotated it "lost N here" in alarm pink, which read as attrition and had it
 * exactly backwards.
 */

const INK = '#4f4550'
const MUTED = '#9a8fa3'
const LINE = '#ffe6d9'
/** The one accent. Every bar on the page is this colour. */
const BAR = '#6495ED'
/**
 * Used in exactly one place: the note under a funnel's goal step.
 *
 * It is not a second series and does not break the one-hue rule above, because
 * it colours a sentence rather than a mark. The reason it exists is that the
 * page used to print "lost N here" in alarm pink under "Left for a vendor",
 * which read as a leak. An outbound click is the only thing on this site that
 * can earn anything. It is the goal, and it should look like one.
 */
const WIN = '#2e8b6b'

type Stats = {
  days: number
  totals: { sessions: number; views: number; outbound: number; outboundSessions: number; carted: number; comments: number }
  byName: { name: string; count: number; sessions: number }[]
  topProducts: { productId: string; vendor: string; cat: string; clicks: number; views: number; carted: number }[]
  topVendors: { vendor: string; clicks: number; views: number; products: number }[]
  topSections: { section: string; views: number; sessions: number; clicks: number }[]
  topCollections: { slug: string; views: number; sessions: number }[]
  searches: { term: string; count: number }[]
  zeroSearches: { term: string; count: number }[]
  disliked: { productId: string; vendor: string; downs: number }[]
  daily: { day: string; sessions: number; clicks: number }[]
  funnels: { key: string; title: string; note: string; steps: { label: string; sessions: number; goal?: boolean }[] }[]
}

const RANGES = [
  { d: 1, label: '24h' },
  { d: 7, label: '7 days' },
  { d: 30, label: '30 days' },
  { d: 90, label: '90 days' },
]

function pct(a: number, b: number): string {
  if (!b) return '0%'
  return `${((a / b) * 100).toFixed(a / b < 0.1 ? 1 : 0)}%`
}

/** A headline number. No plot, so no hover layer and no legend. */
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border-[3px] rounded-[18px] px-4 py-3.5" style={{ borderColor: LINE }}>
      <div className="text-[11px] font-extrabold uppercase tracking-[.7px]" style={{ color: MUTED }}>{label}</div>
      <div className="font-display font-extrabold text-[28px] leading-tight" style={{ color: INK }}>{value}</div>
      {sub && <div className="text-[12px] font-bold" style={{ color: MUTED }}>{sub}</div>}
    </div>
  )
}

/**
 * One row of a ranked list: a label, a bar, a value.
 *
 * The bar is 10px with 4px rounded ends anchored at the left, and it never
 * carries the number itself. `max` comes from the top row so the longest bar
 * fills the track, which is what makes the shape of a list readable at a glance.
 */
function Bar({ label, value, max, note, title }: { label: string; value: number; max: number; note?: string; title?: string }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-[5px]" title={title}>
      <div className="w-[46%] min-w-0 text-[13px] font-bold truncate" style={{ color: INK }}>{label}</div>
      <div className="flex-1 h-[10px] rounded-full overflow-hidden" style={{ background: '#f2ecf5' }}>
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: BAR }} />
      </div>
      <div className="w-[92px] text-right text-[12.5px] font-extrabold tabular-nums" style={{ color: INK }}>
        {value.toLocaleString()}
        {note && <span className="font-bold ml-1.5" style={{ color: MUTED }}>{note}</span>}
      </div>
    </div>
  )
}

function Panel({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border-[3px] rounded-[20px] p-4" style={{ borderColor: LINE }}>
      <h2 className="font-display font-extrabold text-[16px]" style={{ color: INK }}>{title}</h2>
      {blurb && <p className="text-[12.5px] font-semibold mb-2.5 mt-0.5 leading-relaxed" style={{ color: MUTED }}>{blurb}</p>}
      <div className={blurb ? '' : 'mt-2'}>{children}</div>
    </section>
  )
}

function Empty({ what }: { what: string }) {
  return <p className="text-[13px] font-bold py-2" style={{ color: MUTED }}>No {what} recorded yet.</p>
}

export default function AdminDashboard() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<Stats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch(`/api/admin/stats?days=${days}`)
      const j = await r.json()
      if (!r.ok) {
        setErr(r.status === 401 ? 'unauthorized' : (j.error ?? 'could not load'))
        setData(null)
      } else {
        setData(j as Stats)
      }
    } catch {
      setErr('network error')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { void load() }, [load])

  if (err === 'unauthorized') {
    return (
      <div className="bg-white border-[3px] rounded-[20px] p-6 max-w-[60ch]" style={{ borderColor: LINE }}>
        <h2 className="font-display font-extrabold text-[18px]" style={{ color: INK }}>Curator sign-in needed</h2>
        <p className="text-[14px] leading-relaxed mt-1.5" style={{ color: MUTED }}>
          Go to the home page, type <strong style={{ color: INK }}>adamode</strong> anywhere on the page, and
          enter the PIN. Then come back here. The session lasts 12 hours.
        </p>
      </div>
    )
  }

  const t = data?.totals
  const ctr = t ? pct(t.outboundSessions, t.sessions) : '0%'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.d}
            onClick={() => setDays(r.d)}
            className="border-2 font-display font-extrabold rounded-full px-3.5 py-1.5 text-[13px] transition-colors"
            style={
              days === r.d
                ? { borderColor: BAR, background: BAR, color: '#fff' }
                : { borderColor: LINE, background: '#fff', color: MUTED }
            }
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => void load()}
          className="text-[12.5px] font-bold underline ml-1"
          style={{ color: MUTED }}
        >
          refresh
        </button>
        {loading && <span className="text-[12.5px] font-bold" style={{ color: MUTED }}>loading…</span>}
      </div>

      <p className="text-[12.5px] font-semibold leading-relaxed max-w-[75ch] bg-[#f4efff] border-2 border-dashed rounded-[14px] px-3.5 py-2.5"
         style={{ color: INK, borderColor: '#b79cff' }}>
        These are <strong>our clicks, not vendor sales.</strong> We never take payment, so the furthest
        thing measurable is the moment someone reaches a shop. That moment is the goal rather than a
        leak: it is the only thing here that can earn. Whether any of them then bought is in the
        network dashboard and never in this one, so read every ranking as most clicked rather than
        most bought. Sessions are per browser tab, so one person over two visits counts twice.
      </p>

      {err && err !== 'unauthorized' && (
        <p className="text-[13px] font-bold text-[#e0227a]">{err}</p>
      )}

      {t && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Tile label="Sessions" value={t.sessions.toLocaleString()} />
          <Tile label="Page views" value={t.views.toLocaleString()} />
          <Tile label="Clicks out" value={t.outbound.toLocaleString()} sub="handed to a shop" />
          <Tile label="Click rate" value={ctr} sub="sessions that reached one" />
          <Tile label="Added to cart" value={t.carted.toLocaleString()} />
          <Tile label="Comments" value={t.comments.toLocaleString()} />
        </div>
      )}

      {/* Workflows: how far a session gets, and where the rest stop.
          A step marked `goal` is the point of the funnel rather than another
          rung on it, and is annotated as a win rather than as attrition. */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.funnels.map((f) => {
            const top = f.steps[0]?.sessions ?? 0
            return (
              <Panel key={f.key} title={f.title} blurb={f.note}>
                {top === 0 ? (
                  <Empty what="steps" />
                ) : (
                  f.steps.map((s, i) => {
                    const prev = i > 0 ? f.steps[i - 1].sessions : null
                    const drop = prev && prev > 0 ? prev - s.sessions : 0
                    return (
                      <div key={s.label}>
                        {/* ABOVE the bar, not below it. The gap belongs between
                            two steps, and printing it underneath made it read as
                            a property of the step it sits under: the line under
                            "Left for a vendor" looked like a count of people
                            lost BY leaving, when it is the count that never got
                            there. */}
                        {prev !== null && drop > 0 && (
                          <div className="text-[11.5px] font-bold pl-[46%] ml-3 mt-[2px] mb-[1px]" style={{ color: MUTED }}>
                            {drop.toLocaleString()} did not get this far
                          </div>
                        )}
                        <Bar
                          label={s.label}
                          value={s.sessions}
                          max={top}
                          note={i > 0 ? pct(s.sessions, top) : undefined}
                        />
                        {s.goal && s.sessions > 0 && (
                          <div className="text-[11.5px] font-bold pl-[46%] ml-3 -mt-[3px] mb-[3px]" style={{ color: WIN }}>
                            handed to a shop, so every one of these can earn
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </Panel>
            )
          })}
        </div>
      )}

      {data && (
        <>
          <Panel
            title="Products"
            blurb="Ranked by clicks out to the vendor. Views and cart adds are shown for context but the bar is always clicks."
          >
            {data.topProducts.length === 0 ? <Empty what="product activity" /> : data.topProducts.map((p) => (
              <Bar
                key={p.productId}
                label={p.productId}
                title={`${p.productId} · ${p.vendor} · ${p.views} views · ${p.carted} cart adds`}
                value={p.clicks}
                max={data.topProducts[0].clicks || 1}
                note={`/ ${p.views}v`}
              />
            ))}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Vendors" blurb="Which shops we actually send people to.">
              {data.topVendors.length === 0 ? <Empty what="vendor activity" /> : data.topVendors.map((v) => (
                <Bar key={v.vendor} label={v.vendor} value={v.clicks} max={data.topVendors[0].clicks || 1} note={`/ ${v.views}v`} />
              ))}
            </Panel>

            <Panel title="Sections" blurb="Product pages are collapsed into one row; 4,400 separate paths would bury everything else.">
              {data.topSections.length === 0 ? <Empty what="page views" /> : data.topSections.map((s) => (
                <Bar key={s.section} label={s.section} value={s.views} max={data.topSections[0].views || 1} note={`${s.clicks} out`} />
              ))}
            </Panel>

            <Panel title="Collections" blurb="Which gift guides get opened.">
              {data.topCollections.length === 0 ? <Empty what="collection views" /> : data.topCollections.map((c) => (
                <Bar key={c.slug} label={c.slug} value={c.views} max={data.topCollections[0].views || 1} />
              ))}
            </Panel>

            <Panel
              title="Searched, found nothing"
              blurb="The most actionable list on this page. Someone wanted it, we do not carry it."
            >
              {data.zeroSearches.length === 0 ? <Empty what="empty searches" /> : data.zeroSearches.map((s) => (
                <Bar key={s.term} label={s.term} value={s.count} max={data.zeroSearches[0].count || 1} />
              ))}
            </Panel>

            <Panel title="Searches" blurb="Everything typed into the box, including the ones that found something.">
              {data.searches.length === 0 ? <Empty what="searches" /> : data.searches.map((s) => (
                <Bar key={s.term} label={s.term} value={s.count} max={data.searches[0].count || 1} />
              ))}
            </Panel>

            <Panel title="Thumbed down" blurb="Products people actively hid. A long bar is a candidate for the exclusion list.">
              {data.disliked.length === 0 ? <Empty what="thumbs down" /> : data.disliked.map((d) => (
                <Bar key={d.productId} label={d.productId} title={`${d.productId} · ${d.vendor}`} value={d.downs} max={data.disliked[0].downs || 1} />
              ))}
            </Panel>
          </div>

          <Panel title="Every event" blurb="Raw counts, for sanity-checking that something is firing at all.">
            {data.byName.length === 0 ? <Empty what="events" /> : data.byName.map((e) => (
              <Bar key={e.name} label={e.name} value={e.count} max={data.byName[0].count || 1} note={`${e.sessions}s`} />
            ))}
          </Panel>
        </>
      )}
    </div>
  )
}
