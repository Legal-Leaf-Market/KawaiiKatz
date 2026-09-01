'use client'

import ProductCard from '@/components/ProductCard'
import type { FilledSection } from '@/lib/anime'
import type { Product } from '@/lib/data'

/**
 * The room's shelves.
 *
 * A CLIENT COMPONENT ONLY BECAUSE ProductCard IS ONE. There is nothing to
 * filter, shuffle or curate here, so this holds no state of its own: it maps
 * sections to grids and stops. /decora is a client component because it really
 * does filter, search and run Ada mode; copying that shape here would ship a
 * thousand lines of behaviour to render a list.
 *
 * The stickers are `background-image` on a span rather than <img>, and that is
 * the same call the sister site's art layer makes: a section whose sticker has
 * not been drawn gets no sticker, where an <img> would put a torn-icon box in
 * the middle of a heading.
 */
export default function AnimeClient({
  sections,
  pool,
}: {
  sections: FilledSection[]
  pool: Product[]
}) {
  return (
    <>
      {sections.map(({ section, products }) => (
        <section key={section.key} className="mt-11 first:mt-7">
          <div className="flex items-end gap-3 mb-1">
            <span
              aria-hidden
              className="shrink-0 w-[64px] h-[64px] bg-no-repeat bg-contain bg-bottom"
              style={{ backgroundImage: `url(/anime/${section.sticker}.webp)` }}
            />
            <div className="min-w-0">
              <div className="font-display font-extrabold text-[11px] uppercase tracking-[.9px] text-[#b79cff]">
                {section.kicker}
              </div>
              <h2 className="font-display font-extrabold text-[24px] sm:text-[30px] text-[#4f4550] leading-[1.1]">
                {section.title}
              </h2>
            </div>
          </div>
          <p className="text-[14px] text-[#6f6473] leading-relaxed max-w-[62ch] mb-4">
            {section.blurb}
          </p>

          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} similarPool={pool} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
