import type { Metadata } from 'next'
import Link from 'next/link'

import ComicStudio from '@/components/ComicStudio'

/**
 * IG Studio — the internal tool, not a page for shoppers.
 *
 * `noindex, nofollow` and absent from the sitemap.
 *
 * The PAGE is still not behind the curator cookie, and the WRITER is. That
 * split is deliberate and it is not the one this comment used to describe: the
 * earlier version said the studio needed no gate because it "holds nothing,
 * reads nothing, and calls nothing", and named the exact thing that would
 * change that — "a server-side generator spending money per request". That
 * generator now exists, at /api/comic-script.
 *
 * So the gate went where the cost is. Laying out a strip, dropping in pictures
 * and exporting the PNG are all still browser-only and still need no login,
 * because a login there would protect a drawing program. Asking Claude to write
 * one bills our account, so that call checks the curator cookie and fails
 * closed without it (see the route).
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
          Give it a premise and it writes the strip — dialogue, shot sizes, and an art note per
          panel to paste into your image tool. Bring the finished pictures back, drop them into the
          panels, and export at Instagram&apos;s 1080×1350. The cat and the panda are written the
          same way every time, so they stay the same two characters from post to post.
        </p>
        <p className="text-[13px] text-[#9a8fa3] font-semibold mt-2">
          Writing needs curator sign-in — it calls the Claude API. Laying out, dropping in pictures
          and exporting do not.
        </p>
      </header>

      <ComicStudio />
    </main>
  )
}
