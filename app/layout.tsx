import type { Metadata, Viewport } from 'next'
import { Baloo_2, Quicksand } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import { SISTER_SITES, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_TITLE, SITE_URL } from '@/lib/site'
import { SITE_NODES } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import PinterestPageVisit from '@/components/PinterestPageVisit'
import PinterestTag from '@/components/PinterestTag'
import SiteEvents from '@/components/SiteEvents'
import { Analytics } from '@vercel/analytics/next'

const _baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
})

const _quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  // metadataBase makes every relative URL below resolve absolutely. Without it
  // og:image ships as a bare path, which every social scraper rejects — the
  // card silently renders with no image and nothing warns you.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: 'kawaii, plushies, cute gifts, kawaii shop, kawaii collectibles, stationery, kids toys',
  // The apex 308-redirects to www, so www is the canonical host. Declaring it
  // stops the two hostnames competing as duplicates.
  alternates: { canonical: '/' },
  openGraph: {
    title: SITE_TITLE,
    description: 'Curated kawaii finds for every budget.',
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: 'Curated kawaii finds for every budget.',
    images: ['/icon.png'],
  },
  /**
   * Pinterest domain verification (claimed 2026-08-24).
   *
   * `verification.other` is the escape hatch for a provider Next has no named
   * field for: each key/value becomes `<meta name="<key>" content="<value>">`
   * verbatim, which is exactly the tag Pinterest hands you. Written here rather
   * than as a raw <meta> in the layout body so it stays with the rest of the
   * head and cannot be dropped by a future metadata refactor.
   *
   * Not a secret — it is served in the HTML of every page by design; the whole
   * point is that Pinterest's crawler can read it.
   */
  verification: {
    other: {
      'p:domain_verify': '501c2dc6d005954dc9ebb8b7e962a365',
    },
  },
  /**
   * Declared explicitly rather than left to Next's app/icon.png convention.
   *
   * That convention gives the browser one image and lets it downscale, and a
   * 1024px cat-and-panda pair downscaled to 16px is two grey blobs. These point
   * the tab at public/icon-16.png and icon-32.png, which are rendered from a
   * SEPARATE, simplified source (assets/icon-small.svg) — same pair, drawn with
   * fewer details and a much heavier outline so it survives. See
   * scripts/mkicons.mjs.
   *
   * The SVG is listed first so any browser that supports it gets the vector.
   */
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: { index: true, follow: true },
}

/**
 * schema.org graph, ported from the pattern on Nicotia and Legal-Leaf.
 *
 * The `sameAs` list is the point: the sister sites already declare each other,
 * which tells search engines they share an operator. Kawaii Katz was absent
 * from that graph, so it accrued none of that association.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffb199',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${_baloo.variable} ${_quicksand.variable} bg-[#fffaf0]`}>
      <head>
        {/*
          impact.com publisher site verification. Everything else in this file
          goes through the `metadata` export above, and this deliberately does
          not: impact.com issues the token in a `value` attribute and Next's
          metadata API only ever emits `content`, so a `metadata.other` entry
          would ship a tag their verifier does not read.

          The props are cast for the same reason. `value` is not a standard meta
          attribute, so React's own types do not declare it and `pnpm run check`
          rejects it without the cast. react-dom does render it through. Leave
          the attribute as impact.com issued it rather than "correcting" it to
          `content`. The token is public by definition, since it ships in the
          HTML of every page, so it is inline rather than an env var.
        */}
        <meta
          {...({
            name: 'impact-site-verification',
            value: '82b29c89-882c-4cd7-8d1e-940268c000d3',
          } as React.MetaHTMLAttributes<HTMLMetaElement>)}
        />
      </head>
      <body className="antialiased">
        {/* Site-wide identity only. The page-level node is emitted by each
            route, because a single one here described every page as the home
            CollectionPage — see lib/schema.ts. */}
        <JsonLd nodes={SITE_NODES} />
        <StoreProvider>{children}</StoreProvider>
        <SiteEvents />
        <PinterestTag />
        <PinterestPageVisit />
        <Analytics />
      </body>
    </html>
  )
}
