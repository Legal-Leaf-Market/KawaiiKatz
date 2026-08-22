# Affiliate applications — ready to submit

Everything a human needs to file the Impact and AWIN applications for the
2026-08-22 kawaii/decora intake, in the order they should be filed.

**Why this file exists rather than the applications simply being submitted:** an
agent working in this repo has no Impact or AWIN credentials, and the sandbox it
runs in refuses egress to `app.impact.com`, `ui.awin.com` and every merchant
host. Applying is an account action taken in your name, against terms you are
agreeing to. So the research, the boilerplate and the per-merchant pitch are
prepared here and the submitting is yours — it should take a few minutes per
programme with this open beside the form.

Keep it updated as approvals land: the `Status` column is the only record of
which of these earn anything.

---

## The site, as the networks need it described

Reusable across every application. Most of these forms ask the same six things.

| Field | Value |
|---|---|
| Site | https://www.kawaiikatz.com |
| Publisher / company | Legal-Leaf Market |
| Model | Affiliate storefront. Aggregates catalogues from partner Shopify merchants into one browsable catalogue; every product links out to the merchant's own checkout. We never take payment and never hold stock. |
| Vertical | Kawaii / Japanese pop-culture gifts, toys, apparel and accessories |
| Catalogue size | ~1,600–2,000 live products across 12 merchants |
| Categories | Plushies · Blind boxes & collectibles · Stationery · Apparel · Accessories · Home & decor · Kitchen & lunch · Puzzles & games · Learning & wooden toys · Tech & gaming · Snacks |
| Audience | Gift buyers and parents shopping for kids and teens; kawaii, decora and pastel-scene enthusiasts |
| Promotional methods | Curated content and product discovery. **No** brand-keyword PPC bidding, **no** cookie stuffing, **no** incentivised traffic, **no** toolbar/extension. Outbound clicks only. |
| Existing networks | **impact.com** (4 programmes, site already verified via meta tag in `app/layout.tsx`) · **AWIN** (publisher ID `3022399`, live with BRKOX advertiser `129093`) |
| Sister sites | legal-leafmarket.com · nicotiamarket.com · herballeafmarket.com |

### The paragraph that is worth leading with

Use this near-verbatim in the "why are you a good fit" box, especially for
Claire's and Smiggle. It is the genuinely unusual thing about this site and it
is the thing a family brand's affiliate manager is actually screening for:

> Kawaii Katz runs an automated two-layer content filter on every apparel and
> accessory listing it ingests — a curated phrase screen, plus a coco-ssd image
> scan that flags photos featuring adult models — specifically to keep the
> catalogue appropriate for the kids and teens our audience is shopping for. We
> drop listings rather than risk them. Merchants are also screened for
> trustworthiness before listing, and we have delisted a partner over reputation
> concerns despite the programme being live.

That last sentence is true (Tokyocanvas, 2026-08-12) and it is worth saying.

---

## AWIN — file these first

You are already an AWIN publisher (`3022399`), so these are advertiser
applications inside an existing account, not new registrations. That makes them
the fastest thing on this page, and two of the three are the best product fit in
the whole intake.

Apply at **ui.awin.com → Advertisers → Advertiser Directory → search the name →
Join Programme**.

| # | Advertiser | Advertiser ID | Rate | Cookie | Status |
|---|---|---|---|---|---|
| 1 | **Claire's** | look up | 2% | 30d | ☐ not applied |
| 2 | **Smiggle** | look up | 7% | 30d | ☐ not applied |
| 3 | **TruffleShuffle** | `1465` (unconfirmed) | 8% | 30d | ☐ not applied |

**Claire's — the pitch.** This is the accessories half of Ada's brief almost
line for line: earrings, hair clips, bows, scrunchies, cat-ear headbands,
bracelets, kid-safe lip gloss. Lead with the content-filter paragraph above.
2% is the lowest rate here, so it is worth what it converts, not what it pays.

**Smiggle — the pitch.** Explicitly aimed at ages 6–12 and entirely pastel;
the single safest kid-friendly fit found. Fills stationery, pencil cases,
backpacks and purses rather than apparel. UK-first catalogue — say plainly that
a share of the audience is UK/EU so nobody is surprised by the geo mix.

**TruffleShuffle — the pitch.** They keep a kawaii department alongside the
licensed 70s–90s ranges, and everything is officially licensed, which is a real
trust signal. Note their programme **forbids bidding on their brand keywords** —
we do no PPC at all, so say so explicitly; it is a free point in our favour.

> ⚠ **Confirm advertiser ID `1465` in the AWIN dashboard before it goes in
> `awinMerchantId`.** It was read off a public merchant-profile URL, not the
> dashboard. A wrong ID credits somebody else's programme.

**Once approved, per advertiser:** put the AWIN advertiser ID into
`awinMerchantId` in `lib/data.ts` and leave `affiliateParam` empty —
`affiliateUrl()` builds the awin1.com deep link from `AWIN_PUBLISHER_ID`. But
see the note at the bottom: none of these three can carry products yet.

---

## Impact — the bigger prize, and one live question

Apply at **app.impact.com → Marketplace → search the brand → Apply**.

| # | Brand | Rate | Cookie | Status |
|---|---|---|---|---|
| 4 | **Hot Topic** | 10% of net sale | 14d | ☐ not applied — **check marketplace first** |

**Hot Topic is the one Ada asked for by name.** Its programme has historically
been on Rakuten, not Impact. But Rakuten announced on 2026-04-28 that it is
retiring its own tracking stack and migrating roughly 2,000 advertiser
programmes onto impact.com. So:

1. Search the Impact marketplace for `hottopic.com` **first**. If a row exists,
   apply there and you are done — no new network relationship.
2. Only if it does not, apply through the HT Partner Program form on
   hottopic.com and expect to land on Rakuten.

Search for the domain, not the brand name — and check whether both a standard
and a **Creator** programme exist. On the Legal-Leaf intake, Creator programmes
paid up to **4× the standard rate for identical traffic** (Wooden Spoon Herbs
was 5% standard vs 20% Creator). Take the best-paying one rather than the first
match. Also read the payout label: "Recurring Sales" is worth materially more
per customer than "Online Sale" on anything repeat-purchased.

**Also worth doing while you are in there:** the four 2026-08-11 Impact
applications (Tokyo Tiger, Sydney Sock Project, Vix Socks, and the retired
Tokyocanvas row) have never been confirmed as approved. Sydney Sock Project and
Vix Socks have 466 products live and earning **nothing** because
`affiliateParam` is empty. If those approvals have landed, the SubIds are
sitting in the dashboard and are a one-line fix each in `lib/data.ts`. That is
the highest-value five minutes on this page.

---

## The Shopify-app programmes (not Impact or AWIN)

Not what was asked for, but they are the ones that can actually put products on
the shelf, because all six are Shopify and this site ingests `products.json`.
Each is a form on the merchant's own site.

These are now **urgent rather than optional**, because four of them are already live on the
site and sending real shoppers out for free. Feeds were read on 2026-08-22; the product
counts below are what each is contributing right now.

| Merchant | Apply at | Rate | Live? | Status |
|---|---|---|---|---|
| **Grumpy Bunny** | no programme found — **cold approach needed** | — | ● 449 products | ☐ **highest value** |
| **The Kawaii Shoppu** | `/pages/register-affiliate-account` | 10%, 30d | ● 491 products | ☐ |
| **Kawaii Babe** | `/pages/collab` | ? — gated at 10k followers | ● live | ☐ |
| **sugarhai** | `/pages/collab` | ? | ● 427 products | ☐ |
| Kawaii Slime Company | `kawaiislimecompany.refersion.com` (Refersion) | 10% | ○ pending | ☐ |
| Blippo | `/pages/affiliate` | ? | ○ pending | ☐ |

**Grumpy Bunny is the one to write to first.** It contributes 255 apparel and 125 accessory
products — more apparel than the rest of the catalogue put together, and it is genuine
Harajuku decora (ACDC RAG, Dear My Love, Psycho Nation). It has no affiliate programme we
could find, so this is an email, not a form. They are a small UK importer; a direct note
offering to send them traffic is likely to land better than a network application would.

---

## The thing to understand before expecting revenue

**Approval and products are two separate problems, and for these merchants they
point in opposite directions.**

- The three **AWIN** merchants and **Hot Topic** are the best brand fits and the
  quickest approvals — and **none of them runs Shopify**, so none can put a
  single product in the catalogue. They need a showcase page (the BRKOX pattern,
  `VendorConfig.showcase`) or a bespoke scraper. Approving them changes nothing
  on the site by itself.
- The six **Shopify** merchants can fill the shelf the day their feeds are read
  — and their programmes are small, slower, and in one case nonexistent.

So: file the AWIN applications because they are cheap and they unlock the
showcase work. But if the goal is a fuller apparel and accessories shelf this
week, the Shopify six are the path, and `pnpm probe` plus an approval is all
each one needs.

---

## The Grumpy Bunny email

They have no affiliate programme, so this is an approach rather than an application.
Send it from a real person, not a shared inbox.

**Before sending, check two things:**

1. **Find a name.** They are a small UK importer and there is likely one or two people
   behind it. A name beats "Grumpy Bunny team" by a mile. Their contact page or Instagram
   will have it.
2. **Do not claim traffic numbers.** They went live on the site on 2026-08-22, so there is
   no history to cite, and this repo only carries Vercel Web Analytics, which cannot measure
   outbound clicks per merchant. The email below deliberately promises nothing it cannot
   back, and instead points at the one number neither of us can fudge: what *their* affiliate
   dashboard shows once a link exists.

**Subject:** We're listing ~450 of your products — can we make it official?

> Hi [name],
>
> I run Kawaii Katz (www.kawaiikatz.com), a curated kawaii storefront. It pulls products
> from a dozen merchants into one catalogue and links every one of them straight out to the
> merchant's own checkout — we never take payment or hold stock.
>
> I added Grumpy Bunny this week: around 450 products, and you are immediately the largest
> clothing range on the site. The ACDC RAG, Listen Flavor, Psycho Nation and Dear My Love
> pieces are the reason — nobody else we work with carries anything close, and decora and
> fairy kei are exactly what our visitors come looking for.
>
> The honest part: I could not find an affiliate programme for you anywhere, so those
> clicks are currently coming to you untracked and we are not earning anything on them.
> That is fine for now, but it is not something either of us can build on.
>
> Two ways to fix it, whichever is less trouble for you:
>
> 1. A free Shopify affiliate app — GoAffPro, Refersion and UpPromote all do this. You set
>    the commission rate, we get a tracking link, and it is about ten minutes to install.
> 2. Simpler still: give us a `?ref=` parameter or a discount code you honour, and we settle
>    on attributed orders however suits you.
>
> Either way you would see the traffic in your own dashboard before you owe us anything,
> which seems like the fairest way round for you to judge whether it is worth having.
>
> And if you would rather we were not listing you at all — say so and I will take the
> products down the same day. No hard feelings; I would rather ask than assume.
>
> Either way, it is a genuinely good shop and I am glad it exists.
>
> Best,
> Jacob
> www.kawaiikatz.com

**If they say yes:** the tracking value goes in `affiliateParam` in `lib/data.ts` (or
`awinMerchantId` if they somehow turn out to be on AWIN), and `isUntracked('Grumpy Bunny')`
stops reporting them under `debug.untracked`. Set `commissionPct` to whatever they agree.
