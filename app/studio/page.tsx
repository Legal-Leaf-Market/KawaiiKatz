import type { Metadata } from 'next'
import Link from 'next/link'

import CarouselStudio from '@/components/CarouselStudio'
import ProductPageChrome from '@/components/ProductPageChrome'

/**
 * IG Studio: carousel slides for Instagram, TikTok, Stories and Lemon8.
 *
 * `noindex, nofollow` and absent from the sitemap. Not gated: it reads the
 * public catalogue, calls nothing that costs money, and everything happens in
 * the browser. The output is a stack of PNGs the operator downloads.
 *
 * This replaced the comic strip layout. The strip needed four generated images
 * per post, which cost real money and ran out; a carousel needs none, because
 * the product photographs and the articles already exist. The canvas renderer
 * survived the change unaltered, which is the only part of the comic work worth
 * having kept.
 */

export const metadata: Metadata = {
  title: 'IG Studio | Kawaii Katz',
  robots: { index: false, follow: false },
}

export default function StudioPage() {
  return (
    <ProductPageChrome>
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
          <p className="text-[14.5px] text-[#6f6675] leading-relaxed mt-2 max-w-[70ch]">
            Turn an article, a gift guide, this week&apos;s arrivals or the current price drops into
            a carousel. Export at 1080×1350 for the Instagram feed, or 1080×1920 for TikTok Photo
            Mode, Stories and Lemon8. Same deck, both sizes, no image generation and nothing to pay
            for.
          </p>
        </header>

        <CarouselStudio />
      </main>
    </ProductPageChrome>
  )
}
