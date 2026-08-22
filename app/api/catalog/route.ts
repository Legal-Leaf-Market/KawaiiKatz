import { NextResponse } from 'next/server'

import { CATALOG_REVALIDATE_SECONDS, getCatalog } from '@/lib/catalog-source'

export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60 // allow time for the image scan on cold builds

/**
 * The browser's copy of the catalogue. The building itself lives in
 * lib/catalog-source so this and the server-rendered pages share one
 * implementation and one cache — see the notes there.
 *
 * The `debug` block answers the three questions this catalogue keeps failing to
 * answer out loud, each of which has already cost real time:
 *
 *   empty     — a vendor that fetched fine and returned nothing. `ok: true` has
 *               never meant "a catalogue arrived", only "the fetch did not
 *               throw", and Tokyo Tiger sat at zero for eleven days behind that
 *               distinction. Now it is named rather than inferred from a count.
 *   untracked — a vendor whose outbound clicks earn nothing because it has no
 *               affiliate param yet. 466 sock products have been in this state
 *               since 2026-08-11 and nothing anywhere said so.
 *   pending   — registered but deliberately not scraped, so a vendor being held
 *               back is distinguishable from a vendor being forgotten.
 *
 * IT IS ALWAYS PRESENT, rather than gated on the documented `?debug`, and that
 * is deliberate. Reading a query string means taking `request` and touching
 * `request.url`, and doing that in a route handler opts the whole segment into
 * dynamic rendering — which would throw away the 6h prerender that PROJECT_GUIDE
 * §4b calls the reason a visitor gets products instantly. The block is five
 * short arrays of vendor names, it exposes nothing that the `vendors` array
 * beside it did not already expose, and `?debug` keeps working because an
 * ignored query string is still a valid request for this URL.
 */
export async function GET() {
  const body = await getCatalog()

  return NextResponse.json(
    {
      ...body,
      debug: {
        empty: body.vendors.filter((v) => v.ok && !v.pending && v.fetched === 0).map((v) => v.vendor),
        failed: body.vendors.filter((v) => !v.ok).map((v) => v.vendor),
        untracked: body.vendors.filter((v) => v.untracked).map((v) => v.vendor),
        pending: body.vendors.filter((v) => v.pending).map((v) => v.vendor),
        capped: body.vendors.filter((v) => v.capped).map((v) => v.vendor),
      },
    },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${CATALOG_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
      },
    }
  )
}
