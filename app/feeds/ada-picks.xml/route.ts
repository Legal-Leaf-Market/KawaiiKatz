import { desc } from 'drizzle-orm'

import { getCatalog } from '@/lib/catalog-source'
import { db } from '@/lib/db'
import { storeExclusions, storePicks } from '@/lib/db/schema'
import { imageUrl, renderFeed } from '@/lib/feed-rss'
import { SITE_URL } from '@/lib/site'
import type { Product } from '@/lib/data'

/**
 * Ada's Picks, as a feed. Its own route, not another slug on /feeds/[slug].
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS NOT ON THE SHARED ROUTE
 *
 * Segment config is per-route, and this feed wants a different cadence from
 * every other one. A board feed changes when the catalogue changes, so six
 * hours matches it exactly. This one changes the moment a person presses a
 * star, and it shipped on the shared route first: the picks table was emptied,
 * the feed prerendered with zero items, and starring four products did nothing
 * to it because the entry was cached for six hours. Waiting six hours to
 * publish a judgement is the wrong trade for the one list on this site that IS
 * a judgement.
 *
 * A static segment beats a dynamic one in Next routing, so this wins over
 * `[slug]` for `/feeds/ada-picks.xml` with no other change.
 *
 * Ten minutes rather than six hours, and it costs almost nothing: ISR only
 * regenerates on request, and the only thing that ever requests this URL is
 * Pinterest, a few times a day. The per-vendor unstable_cache entries mean a
 * regeneration re-reads the catalogue rather than re-scraping it.
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS THE ONLY FEED HERE THAT PUBLISHES A JUDGEMENT
 *
 * Every other feed publishes a RULE: a category, a season, a shelf. This one is
 * chosen by a person one product at a time, which makes it the truest thing on
 * the site to the site's own proposition, and until now it had no way of
 * reaching Pinterest at all.
 */
export const revalidate = 600 // 10 minutes — must stay statically analysable

/** No dynamic params to enumerate; this is a fixed path. */
export const dynamicParams = false

const TITLE = "Ada's Picks"
const TAGLINE = 'The shelf, one product at a time, chosen by a person rather than a rule'

/**
 * No `catLead` and no `pinTags`, for the reason section 4f gives for the
 * Christmas season: this holds every category at once, so its Pins really are a
 * Switch case and a plushie and a packet of ramen, and the product's own
 * category tags are the accurate ones under the board's lead hashtag.
 */
const HASHTAG = 'KawaiiFinds'

/**
 * The picked products, oldest pick first.
 *
 * Read straight from the table rather than through /api/picks, because this
 * runs during a prerender and a route fetching its own API at build time is a
 * request to a server that is not listening yet.
 *
 * FAILS CLOSED, which is the opposite of the exclusions read on the shared
 * route and is right in both cases. An unreachable exclusions table means
 * publishing something that should have been hidden, so that one fails open to
 * keep the build alive. An unreachable picks table means publishing nothing,
 * which is simply an empty feed. Inventing content is the one thing a curated
 * list must never do.
 */
async function pickedIds(): Promise<string[]> {
  try {
    const rows = await db
      .select({ productId: storePicks.productId, pickedAt: storePicks.pickedAt })
      .from(storePicks)
      .orderBy(storePicks.pickedAt)
    return rows.map((r) => r.productId)
  } catch (e) {
    console.warn(`[feeds] picks unavailable, ada-picks is empty: ${(e as Error).message}`)
    return []
  }
}

/** Fails OPEN, matching the shared route: a missing DATABASE_URL must not break the build. */
async function excludedIds(): Promise<Set<string>> {
  try {
    const rows = await db.select({ productId: storeExclusions.productId }).from(storeExclusions)
    return new Set(rows.map((r) => r.productId))
  } catch (e) {
    console.warn(`[feeds] exclusions unavailable, ada-picks is unfiltered: ${(e as Error).message}`)
    return new Set()
  }
}

export async function GET() {
  const [{ products }, hidden, ids] = await Promise.all([
    getCatalog(),
    excludedIds(),
    pickedIds(),
  ])

  /**
   * Hydrated against the live catalogue rather than served from the picks
   * table's own denormalised columns, and ONLY what is still in it. A pick
   * whose product has left the shop is a Pin at a dead page, and a Pin is
   * durable and public in a way a stale rail tile is not.
   */
  const byId = new Map(products.filter((p) => !hidden.has(p.id)).map((p) => [p.id, p]))
  const items = ids
    .map((id) => byId.get(id))
    .filter((p): p is Product => !!p && !!imageUrl(p))

  /**
   * NOT re-sorted by `added`, unlike every board feed, and the rule is what
   * exempts it. The point of that sort is that new items APPEND rather than
   * landing in the middle and shifting everything after them. For a picked list
   * the date that behaves that way is the date it was PICKED, not the date the
   * shop first stocked it: starring an old product would file it halfway up a
   * feed Pinterest has already read. `pickedIds()` has already ordered it.
   */
  return renderFeed(
    { title: TITLE, tagline: TAGLINE, pageUrl: `${SITE_URL}/`, slug: 'ada-picks', pin: { tag: HASHTAG } },
    items,
    revalidate
  )
}
