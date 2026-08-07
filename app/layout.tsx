import type { Metadata, Viewport } from 'next'
import { Baloo_2, Quicksand } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import { SISTER_SITES, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site'

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
  title: '🐈‍⬛ Kawaii Katz 🐼 — Kawaii, Clever & Kind',
  description: SITE_DESCRIPTION,
  keywords: 'kawaii, plushies, cute gifts, kawaii shop, kawaii collectibles, stationery, kids toys',
  // The apex 308-redirects to www, so www is the canonical host. Declaring it
  // stops the two hostnames competing as duplicates.
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: 'Curated kawaii finds for every budget.',
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: 'Curated kawaii finds for every budget.',
    images: ['/icon.png'],
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
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon.png`,
      sameAs: SISTER_SITES,
    },
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/#page`,
      url: `${SITE_URL}/`,
      name: `${SITE_NAME} — ${SITE_TAGLINE}`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: 'Curated kawaii plushies, stationery, kitchen, puzzles and collectibles compared across the shops we carry.',
    },
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffb199',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${_baloo.variable} ${_quicksand.variable} bg-[#fffaf0]`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          // Serialised from a literal we control, so there is no user input to
          // escape; JSON.stringify is what Next's own docs prescribe here.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
