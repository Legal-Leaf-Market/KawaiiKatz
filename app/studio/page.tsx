import type { Metadata } from 'next'
import Link from 'next/link'

import ComicStudio from '@/components/ComicStudio'

/**
 * IG Studio — the internal tool, not a page for shoppers.
 *
 * `noindex, nofollow` and absent from the sitemap. It is not behind the curator
 * cookie, and deliberately: it holds nothing, reads nothing, and calls nothing.
 * Everything happens in the browser and the only output is a PNG the operator
 * downloads. A login here would be a login protecting a drawing program.
 *
 * The one thing that WOULD need the gate is a server-side generator spending
 * money per request. There isn't one — see lib/comic.ts.
 */

export const metadata: Metadata = {
  title: 'IG Studio | Kawaii Katz',
  robots: { index: false, follow: false },
}

export default function StudioPage() {
  return (
    <main className="max-w-[1180px] mx-auto px-4 py-6">
      <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
        <Link href="/" className="hover:underline">Kawaii Katz</Link>
        <span className="mx-1.5">›</span>
        <span>IG Studio</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-display text-[30px] sm:text-[36px] text-[#4f4550] leading-tight">
          🎬 IG Studio
        </h1>
        <p className="text-[14.5px] text-[#6f6675] leading-relaxed mt-2 max-w-[68ch]">
          Lay out a cat-and-panda strip and export it at Instagram&apos;s 1080×1350. Panels use the
          brand marks — the same cat and panda as the header, so the characters never drift — or a
          picture you drew elsewhere and drop in. Speech bubbles, the grid and the crop are handled
          here so every post looks like it came from the same place.
        </p>
      </header>

      <ComicStudio />
    </main>
  )
}
