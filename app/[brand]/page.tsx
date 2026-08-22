import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { awinDeepLink, liveLinkShowcases, linkShowcase } from '@/lib/data'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'

/**
 * Brand pages for merchants we cannot ingest — see the LinkShowcase doc in
 * lib/data.ts for why they exist and why they are gated.
 *
 * A SERVER COMPONENT, unlike /brkox, and deliberately so. That page is a client
 * component because it filters, searches and adds to a cart. There is nothing
 * here to put in a cart: no products, no prices, no live catalogue. Making this
 * a client component would ship a hydration bundle to render what is, honestly,
 * a list of links. The cart and wishlist buttons are absent for the same reason
 * — a cart control on a page with nothing addable is a button that lies.
 *
 * `dynamicParams = false` matters. Without it this root-level dynamic segment
 * would answer for ANY unmatched path on the site and render a brand page for
 * whatever the visitor typed. With it, only the slugs below exist and
 * everything else 404s. Static segments (/brkox, /api/...) still win outright —
 * Next resolves those before it reaches a dynamic one.
 */
export const dynamicParams = false
export const revalidate = 86400 // a day; these are hand-written, not scraped

export function generateStaticParams() {
  return liveLinkShowcases().map((s) => ({ brand: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>
}): Promise<Metadata> {
  const { brand } = await params
  const s = linkShowcase(brand)
  if (!s) return {}
  const title = `${s.emoji} ${s.merchant} — ${s.tagline} | Kawaii Katz`
  return {
    title,
    description: s.intro.slice(0, 155),
    alternates: { canonical: `/${s.slug}` },
    openGraph: { title, description: s.tagline, url: `${SITE_URL}/${s.slug}`, type: 'website' },
  }
}

export default async function Page({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params
  const s = linkShowcase(brand)
  // Belt and braces with dynamicParams=false: a slug that is pending has no
  // params entry, so it should never route here — but if the flag is ever
  // removed, a pending brand must still 404 rather than render dead links.
  if (!s || s.pending) notFound()

  const link = (url: string) => awinDeepLink(url, s.awinMerchantId)
  const tracked = Boolean(s.awinMerchantId)

  return (
    <div className="min-h-screen">
      {/* WebPage, not CollectionPage: this page links out to the merchant's own
          categories and lists no products of its own. */}
      <JsonLd
        nodes={[pageNode({ path: `/${s.slug}`, name: `${s.merchant} — ${s.tagline}`, description: s.intro })]}
      />
      <header className="border-b-[3px] border-[#e6dcff] bg-white/70">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#b79cff] hover:text-[#ff8a65] transition-colors"
          >
            ← Back to Kawaii Katz
          </Link>

          <div className="mt-5 flex items-start gap-4 flex-wrap">
            <div className="text-[54px] leading-none">{s.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 bg-[#7fc4d4] text-white font-display font-extrabold text-[11px] uppercase tracking-[.8px] rounded-full px-3 py-1 mb-2">
                ✨ Partner shop
              </div>
              <h1 className="font-display font-extrabold text-[34px] sm:text-[44px] text-[#4f4550] leading-[1.05]">
                {s.merchant}
              </h1>
              <p className="font-display text-[17px] sm:text-[19px] text-[#ff8a65] mt-1">{s.tagline}</p>
              <p className="text-[14px] sm:text-[15px] text-[#6f6473] leading-relaxed mt-3 max-w-[62ch]">
                {s.intro}
              </p>
              {s.note && (
                <p className="text-[13px] text-[#9a8fa3] mt-2 max-w-[62ch]">📦 {s.note}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-7">
        <h2 className="font-display font-extrabold text-[20px] text-[#4f4550] mb-4">
          Where to start
        </h2>

        <div className="grid gap-3.5 sm:gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {s.sections.map((sec) => (
            <a
              key={sec.url}
              href={link(sec.url)}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="group block bg-white border-[3px] border-[#e6dcff] hover:border-[#b79cff] rounded-[18px] p-5 transition-colors"
            >
              <div className="text-[32px] leading-none mb-2.5">{sec.emoji}</div>
              <div className="font-display font-extrabold text-[17px] text-[#4f4550] group-hover:text-[#b79cff] transition-colors">
                {sec.label}
              </div>
              <p className="text-[13.5px] text-[#6f6473] leading-relaxed mt-1.5">{sec.blurb}</p>
              <div className="font-display font-extrabold text-[13px] text-[#ff8a65] mt-3">
                Shop at {s.merchant} →
              </div>
            </a>
          ))}
        </div>

        <a
          href={link(s.domain)}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex items-center gap-2 mt-7 bg-[#b79cff] hover:bg-[#a487ff] text-white font-display font-extrabold text-[15px] rounded-full px-6 py-3 transition-colors"
        >
          Visit {s.merchant} →
        </a>

        {/*
          Affiliate disclosure, stated on the page rather than only in the
          footer. Every link above is a paid referral and this page exists for
          no other reason, so burying that would be the wrong call — the home
          page's one-line footer note is enough where products are the point,
          but here the links ARE the page.
        */}
        <p className="text-[12.5px] text-[#9a8fa3] leading-relaxed mt-10 max-w-[70ch]">
          {tracked
            ? `Links on this page are affiliate links: if you buy something at ${s.merchant} after clicking one, we may earn a commission at no extra cost to you. It is how Kawaii Katz stays free.`
            : `Links on this page go straight to ${s.merchant}. We are not currently earning a commission on them.`}{' '}
          We are not {s.merchant} — prices, stock, delivery and returns are all theirs, and
          anything you buy is a purchase from them.
        </p>
      </main>
    </div>
  )
}
