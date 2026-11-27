/**
 * The footer line that points at the family's other sites (cross promotion
 * audit, Jake, 2026-11-27). Kawaii Katz is made in Columbus, Indiana, by Ada;
 * her dad Jake runs the sites below.
 *
 * Kid-safe on purpose: Legal Leaf Market is a 21+ smoke shop, so it is never
 * linked from here (and it does not link here either). Every link is tagged so
 * the sites can count what the family sends them.
 */
const REF = 'utm_source=kawaiikatz&utm_medium=referral&utm_campaign=family'

const LINKS = [
  { href: `https://heartofcolumbus.shop/b/kawaii-katz/?${REF}`, label: 'Heart of Columbus', what: 'more Columbus small businesses' },
  { href: `https://crossroadsweddingco.shop/?${REF}`, label: 'Crossroads Wedding & Event Co.', what: 'a party DJ for the big day' },
  { href: `https://shipitwithai.heartofcolumbus.shop/work/kawaii-katz/?${REF}`, label: 'Ship It With AI', what: 'how this shop was built' },
]

export default function FamilyLinks() {
  return (
    <div className="w-full mt-3 pt-3 border-t border-[#4f4550]/20 text-sm text-[#4f4550]">
      <p className="font-bold">Made in Columbus, Indiana, by Ada and her dad Jake. More from our family:</p>
      <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="font-bold underline underline-offset-2 hover:opacity-80">{l.label}</a>
            <span className="opacity-80">, {l.what}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
