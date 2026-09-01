'use client'

import ProductCard from '@/components/ProductCard'
import type { FilledSection } from '@/lib/anime'
import type { Product } from '@/lib/data'
import s from './anime.module.css'

/**
 * The shelves.
 *
 * A Client Component only because ProductCard is one. It holds no state: it
 * maps sections to shelves and stops. /decora is a client component because it
 * genuinely filters, searches and runs Ada mode; copying that shape here would
 * ship a thousand lines of behaviour to render a list.
 *
 * NOTHING NON-SERIALISABLE CROSSES INTO HERE. FilledSection carries
 * Omit<AnimeSection,'match'>, because the first version passed the matcher and
 * broke the production build outright: functions do not survive the server to
 * client boundary, and it only failed on the first deploy where the shelves
 * actually had something on them.
 *
 * The sticker is a background-image on a span rather than an <img>: a section
 * whose art has not been drawn gets no sticker, where an <img> would put a
 * torn-icon box in the middle of a heading.
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
      {sections.map(({ section, products }, i) => (
        <div key={section.key}>
          {/* Between every shelf, not once under the hero. Skipped above the
              first, where the hero's own dissolve already does this job. */}
          {i > 0 && <div aria-hidden className={s.divider} />}

          <section
            className={`${s.shelf} ${i % 2 === 1 ? s.toned : ''} mt-9`}
            style={{ ['--accent' as string]: section.accent }}
          >
            <div className={s.stickerWrap}>
              <span
                aria-hidden
                className={s.sticker}
                style={{ backgroundImage: `url(/anime/${section.sticker}.webp)` }}
              />
              <div className="min-w-0 pb-1">
                <div className={`${s.kicker} font-display font-extrabold text-[11px] uppercase tracking-[1px]`}>
                  {section.kicker}
                </div>
                <h2 className="font-display font-extrabold text-[26px] sm:text-[34px] text-[#4f4550] leading-[1.06] mt-1">
                  <span className={s.title}>{section.title}</span>
                </h2>
              </div>
            </div>

            <p className="text-[14.5px] text-[#6f6473] leading-relaxed max-w-[62ch] mt-3 mb-5">
              {section.blurb}
            </p>

            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} similarPool={pool} />
              ))}
            </div>
          </section>
        </div>
      ))}
    </>
  )
}
