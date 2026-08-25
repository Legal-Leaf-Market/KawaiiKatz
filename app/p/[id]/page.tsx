import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getCatalog } from '@/lib/catalog-source'
import { unproxied } from '@/lib/catalog-shared'
import { catName, money, type Product } from '@/lib/data'
import { rankSimilar } from '@/lib/similar'
import { SITE_URL } from '@/lib/site'
import ProductPageActions from '@/components/ProductPageActions'
import ProductPageChrome from '@/components/ProductPageChrome'
import ProductImage from '@/components/ProductImage'

/**
 * A page per product — the landing target for a pin.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS, GIVEN THE RULE AGAINST IT
 *
 * PROJECT_GUIDE says: "Do NOT add product URLs to the sitemap — every product
 * lives on the vendor's own site and we should not compete with them for it."
 * That rule is kept, and so is the reason behind it.
 *
 * The reason is competing with our own merchants in Google. These pages are
 * `noindex, follow`: they are not in the sitemap, they are not crawled into an
 * index, and they cannot outrank a vendor's own product page because they will
 * never appear beside it. What they can do is receive a click from a pin.
 *
 * That distinction is the whole point. Pinterest's community guidelines limit
 * affiliate Pins "repetitively or in large volumes" — but a pin that links
 * HERE is not an affiliate pin at all. It links to our own page, on our own
 * domain, and the affiliate hop happens after the visitor has arrived and
 * chosen to leave. The traffic also lands where the Gift Finder and the taste
 * profile can do something with it, instead of bouncing straight to a merchant.
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS NOT PRERENDERED AT BUILD TIME — AND WHY generateStaticParams IS
 * STILL HERE, RETURNING NOTHING
 *
 * There are ~4,400 products. Listing them all in `generateStaticParams` would
 * add 4,400 pages to a build that already takes minutes and pays a full scrape
 * plus a coco-ssd pass before any cache exists (§4b). So none are built ahead
 * of time; each is rendered the first time somebody follows a pin.
 *
 * But omitting `generateStaticParams` altogether is NOT how you say that. It
 * makes the route fully dynamic, and `revalidate` below is then ignored —
 * every single request re-renders and Vercel sends `no-store`, so the CDN
 * never holds a copy. That is what shipped, and it was measured on production
 * before it was believed: `x-vercel-cache: MISS` on a warm page, and
 * `ƒ /p/[id]` (Dynamic) rather than `● /p/[id]` in the build's route table.
 *
 * The empty array is the documented way to ask for "render on demand, then
 * cache": next/dist/docs/.../generate-static-params.md, "All paths at
 * runtime" — "You must always return an array from generateStaticParams, even
 * if it's empty. Otherwise, the route will be dynamically rendered."
 *
 * Do not delete it as dead code. It looks like a no-op and is not one.
 */

// 6 hours, matching the catalogue's own cache — must stay statically
// analysable, so it is a literal and not CATALOG_REVALIDATE_SECONDS. Next
// reads segment config without evaluating the module, and an imported constant
// fails the build with "Invalid segment configuration export".
export const revalidate = 21600

/** See the note above: empty, but load-bearing. Without it, `revalidate` is dead. */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return []
}

/** Absolute, un-proxied image URL for social scrapers — or null if we have none. */
function ogImage(p: Product): string | null {
  const raw = unproxied(p.image || '')
  if (/^https?:\/\//i.test(raw)) return raw
  return null
}

async function findProduct(id: string): Promise<Product | null> {
  const { products } = await getCatalog()
  return products.find((p) => p.id === id) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const p = await findProduct(id)
  if (!p) return { title: 'Not found | Kawaii Katz' }

  const title = `${p.name} — ${p.vendor} | Kawaii Katz`
  const description = (p.blurb || `${p.name} from ${p.vendor}, ${money(p.price)}.`).slice(0, 155)
  return {
    title,
    description,
    // See the note at the top: not indexed, but links are still followed so the
    // vendor gets the signal from our outbound link rather than nothing.
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}/p/${p.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/p/${p.id}`,
      type: 'website',
      /**
       * `unproxied`, and this is the same bug the pin button already hit once:
       * "Parameter 'image_url' with the value 'https:/api/img?u=…' is not a
       * valid URL format". Every Product.image is the /api/img proxy path,
       * because that is what the cards render — but a social scraper cannot
       * resolve it, and robots.txt disallows /api/ outright, so it would not
       * even be allowed to try. Unwrapping gives it the vendor's CDN URL, which
       * is what pinItUrl() has always sent.
       */
      images: ogImage(p) ? [{ url: ogImage(p) as string }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { products } = await getCatalog()
  const p = products.find((x) => x.id === id)
  if (!p) notFound()

  const similar = rankSimilar(p, products.filter((x) => x.image), 6)

  return (
    <ProductPageChrome>
    <main className="max-w-[1080px] mx-auto px-4 py-6">
      <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
        <Link href="/" className="hover:underline">Kawaii Katz</Link>
        <span className="mx-1.5">›</span>
        <span>{catName(p.cat)}</span>
      </nav>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative aspect-[4/5] rounded-[24px] overflow-hidden border-[3px] border-[#ffb199] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]">
          <ProductImage
            src={p.image}
            alt={p.name}
            fallback="🎀"
            className="w-full h-full object-cover"
            fallbackClassName="absolute inset-0 flex items-center justify-center text-[90px]"
            width={800}
            priority
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[.8px] text-[#b79cff]">{p.vendor}</div>
          <h1 className="font-display text-[26px] sm:text-[30px] text-[#4f4550] leading-tight">{p.name}</h1>

          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className={`font-display text-[30px] ${p.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
              {p.unit && <span className="text-[16px] font-bold mr-1">{p.unit}</span>}
              {money(p.price)}
            </span>
            {p.onSale && p.wasPrice > 0 && (
              <span className="font-sans text-[16px] text-[#9a8fa3] line-through">{money(p.wasPrice)}</span>
            )}
          </div>

          {p.blurb && <p className="text-[14.5px] text-[#6f6675] leading-relaxed">{p.blurb}</p>}

          {p.couponCode && p.couponPct > 0 && (
            <div className="text-[13px] font-bold text-[#a3125c] bg-[#fff0f6] border-2 border-dashed border-[#e0227a] rounded-[14px] px-3 py-2 self-start">
              Extra <strong className="font-display">{p.couponPct}% off</strong> with code{' '}
              <strong className="font-display">{p.couponCode}</strong>
            </div>
          )}

          <ProductPageActions product={p} />

          {/* Required by the FTC, and by Pinterest's own link-sharing rules. */}
          <p className="text-[12px] text-[#9a8fa3] leading-relaxed mt-1">
            We earn a commission if you buy through this link, at no extra cost to you.
            You will check out on {p.vendor}&apos;s own site — Kawaii Katz never takes payment.
          </p>

          <div className="flex gap-1.5 flex-wrap mt-1">
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-[#fffaf0] text-[#9a8fa3]">{catName(p.cat)}</span>
            {p.character && (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full text-white bg-[#b79cff]">{p.character}</span>
            )}
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display font-extrabold text-[19px] text-[#4f4550] mb-3">More like this</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/p/${s.id}`}
                className="block bg-white border-2 border-[#ffb199] rounded-[16px] overflow-hidden hover:-translate-y-1 transition-transform"
              >
                <div className="relative aspect-[4/5] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]">
                  <ProductImage
                    src={s.image}
                    alt={s.name}
                    fallback="🎀"
                    className="w-full h-full object-cover"
                    fallbackClassName="absolute inset-0 flex items-center justify-center text-[34px]"
                    width={240}
                  />
                </div>
                <div className="p-2">
                  <div className="text-[10.5px] leading-tight text-[#9a8fa3] font-bold line-clamp-2">{s.name}</div>
                  <div className={`font-display text-[14px] mt-0.5 ${s.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
                    {money(s.price)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
    </ProductPageChrome>
  )
}
