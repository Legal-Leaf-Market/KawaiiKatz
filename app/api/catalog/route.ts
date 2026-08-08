import { NextResponse } from 'next/server'

import { CATALOG_REVALIDATE_SECONDS, getCatalog } from '@/lib/catalog-source'

export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60 // allow time for the image scan on cold builds

/**
 * The browser's copy of the catalogue. The building itself lives in
 * lib/catalog-source so this and the server-rendered pages share one
 * implementation and one cache — see the notes there.
 */
export async function GET() {
  const body = await getCatalog()

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': `public, s-maxage=${CATALOG_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
    },
  })
}
