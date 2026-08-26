import type { Block } from '@/lib/articles'

/**
 * Renders an article's blocks.
 *
 * A server component with no interactivity: an article is text, and shipping a
 * client bundle to render text would be paying hydration for nothing. The
 * chrome around it (cart, Gift Finder) is a separate island.
 *
 * Every block type gets exactly one presentation. That is the point of blocks
 * over markdown, and it is also what makes these convertible to carousel slides
 * later without parsing anything back out.
 */
export default function ArticleBody({ body }: { body: Block[] }) {
  return (
    <div className="flex flex-col gap-4 max-w-[68ch]">
      {body.map((b, i) => {
        switch (b.t) {
          case 'h':
            return (
              <h2 key={i} className="font-display font-extrabold text-[20px] text-[#4f4550] mt-3 leading-snug">
                {b.text}
              </h2>
            )
          case 'p':
            return (
              <p key={i} className="text-[15px] text-[#4f4550] leading-relaxed">
                {b.text}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="flex flex-col gap-2">
                {b.items.map((it, j) => (
                  <li key={j} className="text-[15px] text-[#4f4550] leading-relaxed pl-5 relative">
                    <span className="absolute left-0 top-0 text-[#ff8a65] font-extrabold">•</span>
                    {it}
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="flex flex-col gap-2">
                {b.items.map((it, j) => (
                  <li key={j} className="text-[15px] text-[#4f4550] leading-relaxed pl-7 relative">
                    <span className="absolute left-0 top-0 font-display font-extrabold text-[#b79cff]">{j + 1}.</span>
                    {it}
                  </li>
                ))}
              </ol>
            )
          case 'table':
            return (
              // Wide content scrolls inside its own container so the page body
              // never scrolls sideways on a phone.
              <div key={i} className="overflow-x-auto -mx-1 px-1">
                <table className="w-full border-collapse text-[14px] min-w-[420px]">
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th
                          key={j}
                          className="text-left font-display font-extrabold text-[12px] uppercase tracking-[.6px] text-[#9a8fa3] border-b-2 border-[#ffe6d9] pb-1.5 pr-4"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td
                            key={k}
                            className={`align-top border-b border-[#ffe6d9] py-2 pr-4 leading-relaxed ${
                              k === 0 ? 'font-bold text-[#4f4550]' : 'text-[#6f6675]'
                            }`}
                          >
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'note':
            return (
              <p
                key={i}
                className="text-[14.5px] text-[#4f4550] leading-relaxed bg-[#f4efff] border-2 border-dashed border-[#b79cff] rounded-[14px] px-4 py-3"
              >
                {b.text}
              </p>
            )
        }
      })}
    </div>
  )
}
