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

  // ---------------------------------------------------------------------------
  {
    slug: 'blind-box-odds',
    emoji: '🎲',
    title: 'Blind box odds, explained honestly',
    answer:
      'A "secret" is usually 1 in 72 or 1 in 144, and a sealed case of 12 gives you roughly an 85% chance of one at the better rate. Buying single boxes is the expensive way to chase, and no shaking technique changes anything.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['blind boxes', 'collecting', 'buying advice'],
    related: 'blind-boxes',
    body: [
      { t: 'h', text: 'The three tiers' },
      {
        t: 'table',
        head: ['Tier', 'Typical odds', 'Share of the series'],
        rows: [
          ['Standard', 'about 1 in 6', 'roughly 70%'],
          ['Rare or chaser', 'about 1 in 24', 'roughly 25%'],
          ['Secret', '1 in 72 to 1 in 144', 'roughly 1 to 3%'],
        ],
      },
      {
        t: 'p',
        text: 'Ratios differ by series and the good ones are printed on the box or the case. If a listing will not tell you the ratio, assume the worst end of that range.',
      },
      { t: 'h', text: 'What a case actually buys you' },
      {
        t: 'p',
        text: 'A sealed case is treated as its own pool, and it contains at most one secret. At 1 in 72, a 12-box case works out to roughly an 85% chance of pulling one, which is far better than twelve independent singles. It is also the only way to complete a standard set without duplicates piling up.',
      },
      {
        t: 'note',
        text: 'The thing most guides skip: a case improves your odds because of how cases are packed, not because you bought more boxes. Twelve singles bought separately from twelve different cases is a worse bet at the same price.',
      },
      { t: 'h', text: 'Things that do not work' },
      {
        t: 'ul',
        items: [
          'Shaking, weighing or squeezing. Manufacturers pad and weight boxes specifically to defeat this, and any trick that once worked has been designed out.',
          'Barcode reading. The runs that had unique codes per figure were patched years ago.',
          'Picking from the middle of the display. Retail boxes are not packed in case order once a display has been opened.',
        ],
      },
      { t: 'h', text: 'Buy it as a toy, not an investment' },
      {
        t: 'p',
        text: 'Secondary prices for secrets are real but volatile, and they collapse the moment a series is reissued. The reliable way to enjoy blind boxes is to like the standard figures enough that a duplicate is not a loss. If you would be unhappy opening the most common one in the series, buy an open-box figure instead and pick the one you want.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'plushie-sizes',
    emoji: '📏',
    title: 'Plushie sizes are lying to you (a bit)',
    answer:
      'The number in the listing is usually the plushie lying flat and stretched, measured tip to tip. A "16 inch" plush sitting on a shelf is commonly 10 to 12 inches tall, so measure against something in your room before you buy.',
    updated: '2026-08-26',
    readMins: 2,
    tags: ['plushies', 'buying advice', 'gifting'],
    related: 'plushies',
    body: [
      { t: 'h', text: 'Why the number is bigger than the plushie' },
      {
        t: 'p',
        text: 'Sellers measure the longest available dimension, which for most animals means flat on its back with ears and legs extended. Nothing about that is dishonest, it is just the industry convention, and it is not how the toy will sit on a bed.',
      },
      {
        t: 'table',
        head: ['Listed size', 'Roughly what arrives', 'Good for'],
        rows: [
          ['6 to 8 in', 'Fits a hand, sits about 5 in tall', 'Desk, bag charm, stocking'],
          ['10 to 12 in', 'Sits about 8 in tall', 'The default gift size'],
          ['16 to 18 in', 'Sits about 11 in tall', 'A child can carry it around'],
          ['24 in and up', 'Genuinely large, awkward to post', 'A statement gift, needs floor space'],
          ['40 in and up', 'Bigger than a toddler', 'Photographs well, lives on the floor'],
        ],
      },
      { t: 'h', text: 'Three checks before you buy' },
      {
        t: 'ol',
        items: [
          'Look for a photo with a person or a hand in it. If every photo is the plushie alone on white, the size is unverifiable.',
          'Measure the number against something real in the room you are buying it for. 18 inches is about the long side of a laptop.',
          'Check the shipped weight if it is listed. A large plush that weighs almost nothing is thinly stuffed and will not hold its shape.',
        ],
      },
      {
        t: 'note',
        text: 'For gifting a child, 10 to 12 inches is the size that actually gets carried around. Bigger ones get admired and then live on a bed.',
      },
      { t: 'h', text: 'The "jumbo" problem' },
      {
        t: 'p',
        text: 'Jumbo, giant and mega are marketing words with no agreed meaning, and in the squishy and plush world jumbo often means about 7 centimetres. Ignore the adjective entirely and read the measurement, and if there is no measurement, treat that as the answer.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'sanrio-real-or-fake',
    emoji: '🎀',
    title: 'Sanrio: licensed, unlicensed, and counterfeit',
    answer:
      'Look for a copyright line reading "© Sanrio Co., Ltd." plus a named distributor. Licensed goods always carry both. Fan-made goods carry neither and do not pretend to; counterfeits copy the character and get the paperwork wrong.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['sanrio', 'buying advice', 'collecting'],
    body: [
      { t: 'h', text: 'Three different things, often confused' },
      {
        t: 'table',
        head: ['Type', 'What it is', 'How you can tell'],
        rows: [
          ['Licensed', 'Made under agreement with Sanrio', 'Copyright line and a named distributor'],
          ['Fan-made', 'An artist’s own work, sold openly as such', 'No Sanrio marks, and no claim to any'],
          ['Counterfeit', 'Pretending to be licensed', 'Character copied, paperwork wrong or missing'],
        ],
      },
      {
        t: 'p',
        text: 'Only the third one is a problem. Fan art at a convention is not trying to fool you, and the price and the stall tell you exactly what it is.',
      },
      { t: 'h', text: 'What licensed goods carry' },
      {
        t: 'ul',
        items: [
          'A copyright line reading "SANRIO CO., LTD." with a year, on a sewn tag, a moulded stamp, or printed on the packaging.',
          'A named licensee or distributor. A tag that says Hello Kitty but never mentions Sanrio or any company is the loudest warning there is.',
          'A product or item number that matches the retailer’s listing.',
          'Consistent character art. The face is drawn to a strict spec, so proportions that feel slightly off usually are.',
        ],
      },
      { t: 'h', text: 'Character tells' },
      {
        t: 'ul',
        items: [
          'Hello Kitty has no mouth. A drawn or embroidered mouth is a counterfeit, every time.',
          'The bow sits on her left ear from the viewer’s perspective, and the face is symmetrical.',
          'Embroidery on genuine plush is dense and even. Fakes show loose stitching, gaps, and eyes at different heights.',
          'Printing is sharp. Pixelation, banding or muddy colour means a copied file.',
        ],
      },
      {
        t: 'note',
        text: 'One honest caveat: some genuinely licensed goods made for one regional market carry tags in another language and look unfamiliar. Unfamiliar is not the same as fake. Check for the copyright line rather than for a look you recognise.',
      },
      { t: 'h', text: 'Where the risk actually is' },
      {
        t: 'p',
        text: 'Counterfeits concentrate in open marketplaces and social-media shops, especially on plush and bags, and especially at prices well under the going rate. A shop with a real returns address, a stated distributor, and photographs of the actual tags is doing the work that makes this checkable.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'montessori-label',
    emoji: '🪵',
    title: 'What "Montessori" means on a toy label',
    answer:
      'Nothing legally. The word is unregulated and anyone can print it. What it should mean is a toy that does one thing, is made of a real material, and lets the child find their own mistakes.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['learning', 'wooden toys', 'parents'],
    related: 'wooden-montessori-toys',
    body: [
      { t: 'h', text: 'Why the word is on everything' },
      {
        t: 'p',
        text: 'Maria Montessori’s name is not a trademark anyone enforces on toys, so it functions as a search term rather than a standard. Plenty of things labelled Montessori are simply wooden, and plenty of genuinely good Montessori materials are not labelled at all.',
      },
      { t: 'h', text: 'Three questions that sort it out' },
      {
        t: 'ol',
        items: [
          'Does it do one thing? A single clear purpose beats a toy with five modes. The point is repetition, not variety.',
          'Does the toy correct the child, or does an adult have to? A shape that only fits one hole teaches by itself. Lights and sounds that celebrate every action teach nothing.',
          'Is it a real material at a real weight? Wood, metal and cloth give honest feedback when handled. Very light plastic does not.',
        ],
      },
      {
        t: 'note',
        text: 'If it has batteries and it praises the child, it is not Montessori, whatever the box says. That is the fastest single filter.',
      },
      { t: 'h', text: 'What actually holds up' },
      {
        t: 'ul',
        items: [
          'Object permanence boxes, posting and sorting toys, simple knobbed puzzles.',
          'Stacking rings and nesting cups, which are self-correcting by design.',
          'Practical-life items scaled down to child size: a small jug, a dustpan, a set of tongs.',
          'Open-ended natural materials, which get used differently at two and at five.',
        ],
      },
      { t: 'h', text: 'Buying it sensibly' },
      {
        t: 'p',
        text: 'Age ranges on these are wider than they look, because a good one is used differently as the child grows. Two or three well-made pieces on an open shelf beat a box of ten, and rotating what is out matters more than owning more. Check finishes are non-toxic and that small parts suit the age, since wooden does not automatically mean safe for a one-year-old.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'resin-vinyl-pvc',
    emoji: '🧪',
    title: 'Resin, vinyl and PVC: what art toys are made of',
    answer:
      'Vinyl and PVC are the same family and cover almost every mass-produced figure. Resin is cast in small runs, heavier, sharper in detail, and far more fragile. The material explains most of the price gap.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['collecting', 'materials', 'blind boxes'],
    related: 'blind-boxes',
    body: [
      { t: 'h', text: 'The three you will meet' },
      {
        t: 'table',
        head: ['Material', 'Feel', 'Breaks how'],
        rows: [
          ['Soft vinyl', 'Light, slightly hollow, gives under a squeeze', 'Dents and creases, rarely shatters'],
          ['PVC or ABS', 'Firmer, solid, most blind box figures', 'Snaps at thin parts'],
          ['Resin', 'Noticeably heavy, cold, glass-smooth', 'Chips and shatters if dropped'],
        ],
      },
      {
        t: 'p',
        text: 'A blind box figure is nearly always PVC or ABS. Resin turns up in artist runs, small-batch designer pieces, and anything described as hand-cast or limited to a low number.',
      },
      { t: 'h', text: 'Why resin costs what it does' },
      {
        t: 'p',
        text: 'Resin is poured into silicone moulds that wear out after a few dozen casts, and each piece is cleaned and painted by hand. That is the whole explanation for the price: it is a short run of hand-finished objects rather than an injection-moulded one. It also means small variations between copies are normal rather than defects.',
      },
      { t: 'h', text: 'Living with them' },
      {
        t: 'ul',
        items: [
          'Keep everything out of direct sun. Vinyl yellows and warps, and pigment fades on all three.',
          'Never leave a figure in a hot car. Vinyl softens enough to deform under its own weight.',
          'Dust with a soft dry brush. Solvent cleaners lift paint, especially on resin.',
          'Resin needs a shelf it cannot be knocked off. A single fall usually ends it.',
          'Soft vinyl that has dented can often be relaxed back with warm, not hot, water.',
        ],
      },
      {
        t: 'note',
        text: 'A quick shop-floor test: pick it up. If it is heavier than it looks, it is resin. That one signal separates the two price tiers more reliably than any label.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'kawaii-under-15',
    emoji: '💸',
    title: 'What is actually good under $15',
    answer:
      'Stationery and small accessories are genuinely good cheap: 80% of the stationery we carry is under $15, at a median of about $7. Plush and blind boxes are not, and buying either at that price usually means buying a worse version.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['budget', 'gifting', 'buying advice'],
    related: 'squishies-and-fidgets',
    body: [
      {
        t: 'p',
        text: 'These numbers come from our own catalogue of 4,426 products across twelve shops, counted rather than estimated. About 1,045 of them, roughly a quarter, sit under $15.',
      },
      { t: 'h', text: 'Where cheap is genuinely good' },
      {
        t: 'table',
        head: ['Category', 'Share under $15', 'Median price'],
        rows: [
          ['Stationery', '80%', 'about $7'],
          ['Snacks and drinks', '95%', 'under $5'],
          ['Accessories', '37%', 'about $20'],
          ['Kitchen and bento', '32%', 'about $21'],
        ],
      },
      {
        t: 'p',
        text: 'Stationery is the standout. Pens, sticker sheets, memo pads and washi are cheap because they are cheap to make well, not because the cheap ones are compromised. A $7 gel pen from a good shop is the same object a $12 one is.',
      },
      { t: 'h', text: 'Where cheap is a compromise' },
      {
        t: 'table',
        head: ['Category', 'Share under $15', 'Median price'],
        rows: [
          ['Plush', '7%', 'about $30'],
          ['Blind boxes and figures', 'very few', 'about $42'],
          ['Puzzles', 'almost none', 'about $50'],
          ['Wooden toys', 'almost none', 'about $36'],
        ],
      },
      {
        t: 'p',
        text: 'Only 7% of plush is under $15, and there is a reason. Below that line you are usually getting thinner stuffing, shorter pile and looser stitching, which are exactly the three things that decide whether a plushie still looks good in a year.',
      },
      {
        t: 'note',
        text: 'The rule of thumb: under $15, buy something flat. Paper, stickers, charms and small accessories are honestly good at that price. Anything stuffed, cast or boxed is better bought one tier up or not at all.',
      },
      { t: 'h', text: 'Getting more for the money' },
      {
        t: 'ul',
        items: [
          'About 171 of the under-$15 items are on sale at any time, so the same budget reaches a tier higher if you are not in a hurry.',
          'Stationery bundles beat single items on cost per piece and look more generous as a gift.',
          'Shipping is the real cost at this price. One $12 order plus $8 postage is a $20 gift; three items from one shop is not.',
          'A little over half of the under-$15 shelf is flagged kid-safe, which makes this the easiest budget for buying for children.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'read-the-shipping-page',
    emoji: '📦',
    title: 'Read the shipping page before you buy',
    answer:
      'Two lines decide everything: where it ships from and what happens with customs. "Processing time" plus "shipping time" is the real wait, and phrases like "10 to 20 business days" quietly mean up to a month.',
    updated: '2026-08-26',
    readMins: 3,
    tags: ['buying advice', 'shipping', 'gifting'],
    body: [
      { t: 'h', text: 'The two numbers that get added together' },
      {
        t: 'p',
        text: 'Almost every complaint about a late kawaii order comes from reading only one of them. Processing is how long before it leaves the warehouse. Shipping is how long it travels. A shop offering "1 to 3 business days processing" and "10 to 20 business days shipping" is telling you up to five weeks, in a way that does not look like five weeks.',
      },
      {
        t: 'note',
        text: 'Business days exclude weekends and holidays. Twenty business days is about four calendar weeks, not three.',
      },
      { t: 'h', text: 'Phrases and what they mean' },
      {
        t: 'table',
        head: ['If it says', 'Expect'],
        rows: [
          ['Ships from our US warehouse', 'Under a week, and simple returns'],
          ['Ships directly from our supplier', 'Two to five weeks, often split parcels'],
          ['Free worldwide shipping', 'The slowest service available'],
          ['Buyer is responsible for customs', 'A possible bill on delivery'],
          ['Pre-order', 'The date is a forecast and often moves'],
        ],
      },
      { t: 'h', text: 'Customs, briefly' },
      {
        t: 'p',
        text: 'On a small order it usually costs nothing. Above your country’s threshold you may pay duty plus a handling fee, and the handling fee is often the larger of the two. A shop that says nothing about customs anywhere has not thought about it, which tells you something about what happens if a parcel goes missing.',
      },
      { t: 'h', text: 'The gifting maths' },
      {
        t: 'p',
        text: 'Work backwards from the date, not forwards from the order. For a birthday, take the longest quoted time, add a week, and order before that. For Christmas from an overseas shop, that means ordering in early November, which is also when stock is best.',
      },
      { t: 'h', text: 'Four things worth checking first' },
      {
        t: 'ul',
        items: [
          'Is there a returns address in your country, or does a return mean posting internationally at your cost?',
          'Is tracking included, or only on paid upgrades?',
          'Does the shop split large orders into several parcels, which multiplies customs events?',
          'Is there a real contact address, not just a form? It is the single best predictor of a problem being fixed.',
        ],
      },
    ],
  },
]

export function article(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}
