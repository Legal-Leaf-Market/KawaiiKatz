/**
 * The article library at /learn.
 *
 * -----------------------------------------------------------------------------
 * `answer` IS A REQUIRED FIELD, AND THAT IS THE HOUSE STYLE ENFORCED IN TYPES
 *
 * PROJECT_GUIDE section 0b says the answer belongs in the first two sentences,
 * never after a preamble. Rather than trust that to discipline, `answer` is its
 * own required field: it renders above the body, it is the meta description,
 * and it is what a carousel's first slide uses. You cannot write one of these
 * without deciding, in one or two sentences, what the reader came for.
 *
 * Nicotia Market is the reason. The long pieces there were good and one was
 * literally called a manifesto before being renamed "the long version". Nobody
 * reads a manifesto about nicotine pouches, and nobody reads one about plushies
 * either. Whittling them down is what made them work, so these start whittled.
 *
 * -----------------------------------------------------------------------------
 * BLOCKS, NOT MARKDOWN OR MDX
 *
 * The body is a typed array of blocks rather than a string of markdown. Three
 * reasons, in order of how much they matter:
 *
 *   1. Every article renders identically, because there is no way to express a
 *      one-off heading level or a stray inline style.
 *   2. It is trivially convertible to carousel slides. A slide is a heading plus
 *      a list, and that is already the shape of the data. Markdown would have to
 *      be parsed back out first.
 *   3. No MDX dependency, no build step, no runtime compiler.
 *
 * The cost is that writing one is more verbose than typing prose. That is the
 * right trade for a library meant to be pushed to four social platforms.
 */

export type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  /** A single boxed line. Use for the one thing a skimmer must not miss. */
  | { t: 'note'; text: string }

export type Article = {
  slug: string
  emoji: string
  title: string
  /** What the reader came for, in one or two sentences. See the note above. */
  answer: string
  /** ISO date. Shown, because advice about washing things ages. */
  updated: string
  readMins: number
  /** Free text, for the index page only. Not a taxonomy. */
  tags: string[]
  /** A collection slug to send the reader to at the end, if one fits. */
  related?: string
  body: Block[]
}

export const ARTICLES: Article[] = [
  // ---------------------------------------------------------------------------
  {
    slug: 'spot-a-fake-nendoroid',
    emoji: '🔍',
    title: 'How to spot a fake Nendoroid',
    answer:
      'Check the box before the figure: authentic Nendoroid boxes have a sharp product number on the side flap, a crisp die-cut window, and correctly spelled branding. Bootlegs give themselves away in print quality long before you open them.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['collecting', 'blind boxes', 'buying advice'],
    related: 'blind-boxes',
    body: [
      {
        t: 'note',
        text: 'One caveat first: a missing hologram sticker does not prove a fake. Plenty of genuine figures ship without one, so treat it as one signal among several rather than a verdict.',
      },
      { t: 'h', text: 'Check the box first' },
      {
        t: 'p',
        text: 'Counterfeiters copy the sculpt reasonably well and the packaging badly, because packaging is where the cost is. Almost every tell is on the box.',
      },
      {
        t: 'ul',
        items: [
          'Printing is fuzzy, over-saturated, or slightly off-register, as though photocopied from a photo of the real box.',
          'Typos in the branding. "Nendorid" and "Nenddroit" are both real examples found in the wild.',
          'The clear window is foggy, warped, loose in its die-cut, or held in with visible tape or glue. A genuine window sits flush and clear.',
          'The barcode is blurry or will not scan.',
          'The product number on the side flap does not match the listing on Good Smile Company\'s own site. This is the single most checkable one.',
        ],
      },
      { t: 'h', text: 'Then check the figure' },
      {
        t: 'ul',
        items: [
          'Paint that crosses its lines, especially at the eyes and hairline. Face plates are printed, so a genuine one is sharp to the edge.',
          'Seams you can feel with a fingernail, or flashing left on from the mould.',
          'Joints that are either loose enough to sag or so tight you are afraid to move them. Genuine ones hold a pose without a fight.',
          'Colours slightly off from the promotional photos, usually flatter or more yellow.',
          'A face plate that does not seat properly, or swap parts that need force.',
        ],
      },
      { t: 'h', text: 'The price tell' },
      {
        t: 'p',
        text: 'A current Nendoroid at a third of the going rate, in stock, shipping immediately, from a seller with no history, is a bootleg. Genuine ones that cheap are pre-owned, damaged, or a preorder someone is offloading, and the listing will say so.',
      },
      { t: 'h', text: 'If you already bought one' },
      {
        t: 'p',
        text: 'Marketplace platforms treat counterfeits as an automatic refund case, so open a claim rather than a return. Photograph the box flap and the barcode alongside the official listing, because that comparison is the fastest thing for a support agent to verify.',
      },
      {
        t: 'note',
        text: 'The short version: match the side-flap product number against Good Smile Company\'s site, look at the window, and read the branding for typos. Three checks, about a minute, and they catch most of what is out there.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'wash-a-plushie',
    emoji: '🧼',
    title: 'How to wash a plushie without wrecking it',
    answer:
      'Surface-clean first, and only machine wash a plushie that is all fabric and stuffing. Anything with beads, glued-on parts, or electronics gets spot-cleaned, and everything air dries flat.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['care', 'plushies', 'parents'],
    related: 'plushies',
    body: [
      { t: 'h', text: 'Decide which kind you have' },
      {
        t: 'table',
        head: ['If it has', 'Do this'],
        rows: [
          ['Fabric and loose stuffing only', 'Machine wash on cold, gentle, in a pillowcase'],
          ['Plastic pellets or beads', 'Spot clean only. Beads clump and never redistribute'],
          ['A sound box, lights, or batteries', 'Spot clean only. Water kills the module'],
          ['Glued eyes, nose, or appliques', 'Spot clean. Agitation lifts glued parts'],
          ['Long or shaggy pile', 'Wash if fabric-only, then brush while damp'],
        ],
      },
      { t: 'h', text: 'Spot cleaning, which handles most cases' },
      {
        t: 'ol',
        items: [
          'Mix a drop of gentle detergent into cool water.',
          'Dip a cloth, wring it out until it is barely damp, and dab the mark. Do not rub, which mats the pile.',
          'Go over the same spot with a second cloth wrung out in clean water, to lift the detergent.',
          'Press with a dry towel, then air dry away from direct heat.',
        ],
      },
      { t: 'h', text: 'Machine washing, if it qualifies' },
      {
        t: 'ol',
        items: [
          'Close or cover any velcro and zips so they do not chew the fur.',
          'Put it in a pillowcase and knot the end, or a mesh laundry bag.',
          'Cold water, gentle cycle, mild detergent, no bleach and no fabric softener. Softener coats the fibres and flattens the pile permanently.',
          'Add an extra rinse. Detergent left in the stuffing is what makes a washed plushie feel stiff.',
        ],
      },
      { t: 'h', text: 'Drying is where they actually get ruined' },
      {
        t: 'p',
        text: 'A tumble dryer melts synthetic pile, shrinks seams, and turns the stuffing into lumps. Squeeze water out by pressing between towels, never by wringing, then dry flat and reshape it by hand while it is damp. Give it a day or two, and finish with a soft brush or a wide comb to lift the pile back up.',
      },
      {
        t: 'note',
        text: 'A plushie that smells musty after drying was not dry in the middle. Stuffing holds water long after the surface feels fine, so give it longer than you think and keep the air moving.',
      },
      { t: 'h', text: 'The one for parents' },
      {
        t: 'p',
        text: 'If it is the one that gets slept with, buy a second identical one early and rotate them. Washing is much easier when there is not a child waiting at the machine, and it doubles the lifespan of both.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'squishy-mochi-slow-rising',
    emoji: '🫧',
    title: 'Squishy, mochi, slow-rising: what the words actually mean',
    answer:
      'They describe three different things: what it is made of, what shape it is, and how fast it springs back. Only "slow-rising" is a real specification, and it is the one that tells you whether you will enjoy it.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['glossary', 'squishies', 'buying advice'],
    related: 'squishies-and-fidgets',
    body: [
      { t: 'h', text: 'The three words, separated' },
      {
        t: 'table',
        head: ['Word', 'What it actually describes', 'Reliable?'],
        rows: [
          ['Squishy', 'The whole category. Anything soft you squeeze', 'No. It is a genre, not a spec'],
          ['Mochi', 'A shape and a feel: small, flat, sticky-soft, usually silicone or TPR', 'Loosely. Describes form, not material'],
          ['Slow-rising', 'How long it takes to return to shape, from about 3 to 60 seconds', 'Yes. This is a measurable property'],
        ],
      },
      {
        t: 'p',
        text: 'If you only remember one thing: slow-rising is the property people actually buy these for, and it is the one most listings leave out.',
      },
      { t: 'h', text: 'What they are made of' },
      {
        t: 'ul',
        items: [
          'Polyurethane foam. The classic slow-rising bread and cake ones. Best rebound, and the ones that yellow with age and light.',
          'TPR or thermoplastic rubber. Stretchy, slightly tacky, the usual material for mochi shapes. Picks up lint.',
          'Silicone. Firmer, cleanest to handle, does not yellow. Usually the pop-and-press kind rather than the squeeze kind.',
          'Gel or bead filled. A membrane around liquid or beads. Very different feel, and the only kind that can actually burst.',
        ],
      },
      { t: 'h', text: 'Why the vocabulary keeps moving' },
      {
        t: 'p',
        text: 'These words came into English through Japanese fandom, marketplace listings, and short-form video, in that order, and none of those three is a dictionary. A word gets attached to a viral product, sellers copy it into their listings to catch the search, and within a season it means whatever the largest group of listings says it means.',
      },
      {
        t: 'p',
        text: '"Mochi" is the clearest case. It starts as a rice cake, becomes a description of that texture, then becomes a shape category, and now sells blanket hoodies and pillows that have nothing to do with either. That is not sellers being dishonest so much as a word doing what popular words do.',
      },
      {
        t: 'note',
        text: 'The practical consequence: search by the property, not the label. "Slow rising 30 seconds" finds what you want. "Mochi squishy" finds whatever is selling this month.',
      },
      { t: 'h', text: 'How to read a listing' },
      {
        t: 'ul',
        items: [
          'A rise time in seconds means someone measured it. That is a good sign about the whole listing.',
          'Size in centimetres beats "jumbo", which is unregulated and often means seven centimetres.',
          'Scented means an added fragrance oil, which fades in weeks and is worth nothing to the price.',
          'No material named usually means TPR. That is fine, just know before you buy.',
        ],
      },
    ],
  },
]

export function article(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}
