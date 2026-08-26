import type { Metadata } from 'next'

import IgLanding from '@/components/IgLanding'
import { StoreProvider } from '@/lib/store'

/**
 * The link-in-bio destination, for Instagram, TikTok and Lemon8.
 *
 * -----------------------------------------------------------------------------
 * noindex, AND THE REASONING IS NOT THE ONE THAT JUST BIT US
 *
 * /p/<id> was noindex until 2026-08-26 and it cost the Pinterest channel a day
 * (§4f). Worth being explicit about why this page is different, so nobody reads
 * that lesson as "never noindex anything".
 *
 * The /p/<id> problem was that Pinterest DISTRIBUTES algorithmically, and it
 * will not push traffic toward a destination marked as not worth indexing. A
 * bio link is not distributed by anything. Somebody taps it, the browser opens
 * it, and no ranking system is involved at any point. Nothing here can be
 * suppressed because nothing here is being ranked.
 *
 * What noindex buys us is that a thin menu page, whose every row is a link to a
 * better page, does not enter the index and compete with the home page and the
 * guides it points at. Out of the sitemap for the same reason.
 *
 * -----------------------------------------------------------------------------
 * NO HEADER, DELIBERATELY
 *
 * Every other page wraps in ProductPageChrome for the header, cart and Gift
 * Finder. This one does not. A visitor who tapped a bio link has one second of
 * intent and a phone; a nav bar, a search box and a cart icon spend that
 * second on furniture. StoreProvider is still here because the shared hooks
 * expect it, but nothing above the content renders.
 */

export const metadata: Metadata = {
  title: 'Kawaii Katz',
  description: 'Cute, clever and kind things from twelve shops, in one place.',
  robots: { index: false, follow: true },
}

export default function IgPage() {
  return (
    <StoreProvider>
      <IgLanding />
    </StoreProvider>
  )
}
