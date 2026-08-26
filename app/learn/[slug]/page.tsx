import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ARTICLES, article } from '@/lib/articles'
import { board } from '@/lib/boards'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import ArticleBody from '@/components/ArticleBody'
import ProductPageChrome from '@/components/ProductPageChrome'

/**
 * One article.
 *
 * -----------------------------------------------------------------------------
 * INDEXABLE, IN THE SITEMAP, AND IT COSTS THE BUILD NOTHING
 *
 * Same reasoning as the gift guides: this competes with no vendor, because no
 * vendor has written it. It is original editorial work and the only content
 * here that answers a question rather than selling something.
 *
 * Unlike a guide, an article never calls getCatalog(). That matters more than
 * it sounds: section 4b tracks how many catalogue-backed routes prerender at
 * build time, and the last measurement was 188s against a 240s ceiling. Ten
 * articles add ten routes and roughly nothing to that number, because they are
 * static text. The catalogue only arrives client-side, through the chrome, for
 * the cart and the Gift Finder.
 *
 * `dynamicParams = false` for the same reason as /gifts/<slug>: without it,
 * /learn/anything renders an article-shaped page for whatever a visitor typed.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const a = article(slug)
  if (!a) return { title: 'Not found | Kawaii Katz' }

  const title = `${a.title} | Kawaii Katz`
  return {
    title,
    // The `answer` field doubles as the meta description. It is already written
    // to be the whole point in one or two sentences, which is exactly what a
    // search result needs, so writing a second summary would only let the two
    // drift apart.
    description: a.answer,
    alternates: { canonical: `${SITE_URL}/learn/${a.slug}` },
    openGraph: {
      title,
      description: a.answer,
      url: `${SITE_URL}/learn/${a.slug}`,
      type: 'article',
    },
  }
}

export default async function LearnArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const a = article(slug)
  if (!a) notFound()

  const rel = a.related ? board(a.related) : undefined

  return (
    <ProductPageChrome>
      <JsonLd
        nodes={[
          pageNode({
            path: `/learn/${a.slug}`,
            name: a.title,
            description: a.answer,
            type: 'Article',
          }),
        ]}
      />

      <article className="max-w-[1180px] mx-auto px-4 py-6">
        <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
          <Link href="/" className="hover:underline">Kawaii Katz</Link>
          <span className="mx-1.5">›</span>
          <Link href="/learn" className="hover:underline">Learn</Link>
          <span className="mx-1.5">›</span>
          <span>{a.title}</span>
        </nav>

        <header className="mb-6 max-w-[68ch]">
          <h1 className="font-display text-[30px] sm:text-[38px] text-[#4f4550] leading-tight">
            {a.emoji} {a.title}
          </h1>

          {/* The answer, before anything else. See lib/articles.ts. */}
          <p className="text-[17px] text-[#4f4550] leading-relaxed mt-3 font-semibold">
            {a.answer}
          </p>

          <p className="text-[12.5px] font-bold text-[#9a8fa3] mt-3">
            {a.readMins} min read · updated{' '}
            {new Date(a.updated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        <ArticleBody body={a.body} />

        {rel && (
          <section className="mt-9 max-w-[68ch]">
            <Link
              href={`/gifts/${rel.slug}`}
              className="block border-[3px] border-[#ffb199] bg-white rounded-[20px] px-4 py-3.5 hover:bg-[#fffaf0] transition-colors"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-[.7px] text-[#b79cff]">
                Now go and look at some
              </span>
              <span className="block font-display font-extrabold text-[18px] text-[#4f4550] leading-tight mt-0.5">
                {rel.emoji} {rel.title}
              </span>
              <span className="block text-[13.5px] text-[#6f6675] mt-0.5">{rel.tagline}</span>
            </Link>
          </section>
        )}

        <section className="mt-9 max-w-[68ch]">
          <h2 className="font-display font-extrabold text-[17px] text-[#4f4550] mb-2.5">
            More from the library
          </h2>
          <div className="flex flex-col gap-1.5">
            {ARTICLES.filter((x) => x.slug !== a.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/learn/${x.slug}`}
                className="text-[14.5px] font-bold text-[#6495ED] hover:underline"
              >
                {x.emoji} {x.title}
              </Link>
            ))}
          </div>
        </section>
      </article>
    </ProductPageChrome>
  )
}
