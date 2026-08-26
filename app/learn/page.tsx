import type { Metadata } from 'next'
import Link from 'next/link'

import { ARTICLES } from '@/lib/articles'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import ProductPageChrome from '@/components/ProductPageChrome'

/**
 * The article library.
 *
 * Each card leads with the article's `answer` rather than a teaser, because the
 * point of the library is that a reader can get what they came for without
 * opening anything. If that costs a click, the click was not worth having.
 */

const INTRO =
  'Short, specific answers to the things people actually ask about cute stuff. ' +
  'No preamble, no life story, about three minutes each.'

export const metadata: Metadata = {
  title: 'Learn | Kawaii Katz',
  description: INTRO,
  alternates: { canonical: `${SITE_URL}/learn` },
  openGraph: { title: 'Learn | Kawaii Katz', description: INTRO, url: `${SITE_URL}/learn` },
}

export default function LearnIndexPage() {
  return (
    <ProductPageChrome>
      <JsonLd nodes={[pageNode({ path: '/learn', name: 'Learn', description: INTRO })]} />

      <main className="max-w-[1180px] mx-auto px-4 py-6">
        <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
          <Link href="/" className="hover:underline">Kawaii Katz</Link>
          <span className="mx-1.5">›</span>
          <span>Learn</span>
        </nav>

        <header className="mb-6 max-w-[68ch]">
          <h1 className="font-display text-[30px] sm:text-[38px] text-[#4f4550] leading-tight">
            📚 Learn
          </h1>
          <p className="text-[15px] text-[#6f6675] leading-relaxed mt-2">{INTRO}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/learn/${a.slug}`}
              className="block border-[3px] border-[#ffe6d9] bg-white rounded-[20px] p-4 hover:border-[#ffb199] transition-colors"
            >
              <h2 className="font-display font-extrabold text-[19px] text-[#4f4550] leading-tight">
                {a.emoji} {a.title}
              </h2>
              <p className="text-[14.5px] text-[#4f4550] leading-relaxed mt-1.5">{a.answer}</p>
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                <span className="text-[11.5px] font-extrabold text-[#9a8fa3]">{a.readMins} min</span>
                {a.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10.5px] font-extrabold px-2 py-[3px] rounded-full bg-[#fffaf0] text-[#9a8fa3]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </ProductPageChrome>
  )
}
