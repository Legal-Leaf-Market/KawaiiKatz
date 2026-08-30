# Task brief: ingest GiftLAB via the AWIN product feed

Hand this file to Claude Code and say "do GIFTLAB_INGEST.md". It is written to be
executed, not discussed.

Written 2026-08-30. If the dates below are more than a month old, re-measure before
trusting any of it.

---

## 0. The one-paragraph version

GiftLAB is an approved AWIN partner (advertiser 95201) who asked to be on Kawaii Katz.
Their site is behind Cloudflare, so `products.json` returns 403 and the normal scraper
can never read them. The fix is to ingest them from AWIN's product feed instead of from
Shopify. That needs one credential from Jacob and a new feed reader in `lib/`. The
vendor row already exists and is `pending`, so nothing is broken while this waits.

---

## 1. What Jacob has to do (nobody else can)

Two steps. Everything in section 3 is blocked until step A is done.

### A. Get the feed URL

**Already established, 2026-08-30, from the Create-a-Feed advertiser list:**

| Field | Value |
|---|---|
| Advertiser | Giftlab |
| Advertiser ID | 95201 |
| **Datafeed ID (`fid`)** | **105668** |
| Datafeed Format | **Awin** (the standard layout, not the Google "Enhanced" one) |
| Products | 2,426 |
| Last update | 2026-05-15 |

The `sftp://datafeeds.shareasale.com/Awin/115671/feed.zip` string shown in that table
is AWIN's **Datafeed Name**, which is where they stage the file. It is not a download
URL, it carries no credentials, and nothing in this stack can speak SFTP. Ignore it.

**What is still needed is the last step of Create-a-Feed:**

1. AWIN → **Toolbox → Product Feeds → Create-a-Feed**
2. Tick **Giftlab (95201)**, datafeed 105668. Continue.
3. On the column selection page, tick exactly these:

   ```
   merchant_product_id     product_name        description
   search_price            rrp_price           currency
   merchant_image_url      aw_deep_link        merchant_category
   merchant_name           in_stock            brand_name
   ```

4. Format **CSV**, delimiter **comma**, compression **gzip** if offered
5. Copy the **generated download URL** on the final screen. That is the artefact this
   whole task is waiting on: it is an `https://productdata.awin.com/...` URL with the
   publisher's API key embedded in the path.

**The last step is the one that keeps being missed.** Selecting the advertiser only
identifies the feed; the download URL is produced at the end of the wizard, and without
it there is no way to fetch anything.

The URL contains an API key. **Do not paste it into a chat and do not commit it.**

### B. Put it in Vercel

```bash
# One or more download URLs, separated by spaces. Order does not matter and you
# do NOT need to know which feed holds which merchant: every feed is pooled and
# each vendor takes the rows whose merchant_id matches its awinMerchantId.
printf 'URL_ONE URL_TWO' | vercel env add AWIN_FEEDS production
printf 'URL_ONE URL_TWO' | vercel env add AWIN_FEEDS preview
```

Use bash, not PowerShell. PowerShell prepends a UTF-8 BOM and the value is silently
wrong (PROJECT_GUIDE section 5).

Then tell Claude the feed is set, and paste the **column order** you ended up with if it
differs from the list above.

### C. One thing to check while you are in there

115671 in the staging path is neither GiftLAB's advertiser id (95201) nor the publisher id
(3022399), so it is most likely an account-level directory, and an account-level
`feed.zip` would be **every merchant joined**, not just GiftLAB. Create-a-Feed can select
several advertisers into one download. If MamaRaya and BRKOX can be ticked alongside
GiftLAB, do it: the same reader would then cover all three, and for MamaRaya and BRKOX it
would replace scraping with a source the merchant maintains.

---

## 2. Why the normal path does not work

Measured 2026-08-30 from a Vercel build, which is a datacentre IP sending `Mozilla/5.0`:

| URL | Result |
|---|---|
| `/products.json` | 403 |
| `/collections/all/products.json` | 403 |
| `/sitemap.xml` | 403 |

All three answer `server=cloudflare` with the "Just a moment..." interstitial rather than
an error page.

The challenge on `sitemap.xml` is the tell. That is a static file every crawler on earth
requests, so this is a site-wide bot rule and not a closed JSON endpoint. PROJECT_GUIDE
section 4 already settles that no User-Agent gets past host-level protection, measured on
Tokyo Tiger. **Do not re-run that experiment.** Trying more headers here is the single
most likely way to waste a session on this task.

The difference from Tokyo Tiger, and the reason this is worth doing at all: we are already
on AWIN, so the catalogue is available from the network as a datafeed. Being approved on a
network buys tracking, not access, but it does buy the feed.

---

## 3. What to build

### 3a. `lib/awin-feed.ts` (new)

A reader that turns one AWIN CSV feed into `Product[]`.

- Fetch the URLs from `process.env.AWIN_FEEDS`. Absent means return `[]` and log
  why. It must fail closed and quiet, exactly like the Shopify path does, so a missing
  credential never takes the site down.
- Handle gzip. `DecompressionStream('gzip')` is available in the Vercel runtime and needs
  no dependency.
- Parse CSV properly. Product descriptions contain commas and quotes, so a `split(',')`
  will corrupt rows. Write a small quoted-field parser or add `csv-parse`. Do not hand-roll
  a regex.
- Map to `Product`, matching `mapShopifyProducts` in `lib/catalog-shared.ts` field for
  field. Read that function first and mirror it rather than inventing a second shape.

Field mapping:

| `Product` | Feed column | Note |
|---|---|---|
| `id` | `merchant_product_id` | prefix it: `` `glab-${id}` ``, matching the `${cfg.prefix}-${handle}` convention |
| `name` | `product_name` | |
| `blurb` | `description` | |
| `price` | `search_price` | |
| `wasPrice` / `onSale` / `discountPct` | `rrp_price` vs `search_price` | only when rrp is genuinely higher |
| `image` | `merchant_image_url` | |
| `url` | `aw_deep_link` | see the warning below |
| `cat` | `categorize(name, merchant_category, description, vendor)` | use the site's own classifier, never the merchant's category directly |
| `vendor` | literal `'GiftLAB'` | not `merchant_name`, which may not match our row |
| `added` | today, first time seen | there is no feed equivalent; see 3d |

**`aw_deep_link` is already a tracked `awin1.com` link.** Do not pass it through
`affiliateUrl()`, which would wrap an already-wrapped link. Either store it in `url` and
make `affiliateUrl()` return it untouched when it already points at `awin1.com`, or add a
`preTracked?: boolean` to `VendorConfig`. The first is less state and fails safer. Check
`affiliateUrl()` in `lib/data.ts` before choosing.

Run the same filters the Shopify path runs: `in_stock` false is dropped, and the product
still goes through the kid-safety text filter and `adultApparelHit`. A feed source is not
a reason to skip the safety layers.

### 3b. Wire it into `lib/catalog-source.ts`

`getCatalog()` currently maps `liveVendors()` to `fetchVendorCatalog`. Give a vendor an
optional `feed: 'awin'` marker and branch to the feed reader instead of `scrapeVendor`.
Keep the per-vendor `unstable_cache` wrapper so a slow feed cannot force a re-scrape of
everybody else.

**Bump the cache key.** It is at `'vendor-catalog-v7'` today, so make it `v8` in the same
commit. Without the bump a warm 6h entry keeps serving old-code results after the deploy
and the change looks like it did nothing (PROJECT_GUIDE section 4).

Watch the 2MB `unstable_cache` entry limit. 2,426 products with descriptions may exceed
it. If it does, the tell is `Failed to set Next.js data cache` in the build output, and
the fix is to trim `blurb` at map time rather than to raise anything.

### 3c. Build-time cost

Every catalogue-backed prerendered route pays this feed on a cold build. Production build
time has gone 62s → 121s → 188s → 228s → 268s across recent deploys, against a
`staticPageGenerationTimeout` of 240s **per page** (not a total budget: an earlier note in
this repo conflated the two). One more network fetch is fine. If the parse turns out to be
slow, cache the parsed result, not the raw download.

### 3d. `added` dates

The RSS feeds order oldest-first by `added` and rely on it being stable, or already
published Pins reshuffle underneath Pinterest (PROJECT_GUIDE section 4f). The AWIN feed
carries no first-seen date. Simplest correct answer: on first ingest stamp every row with
the same date and let genuinely new rows get later ones. Do not use a random or
per-build date.

---

## 4. How to verify, given there is no local egress

`pnpm probe` and plain `curl` cannot reach merchant or feed hosts from a Claude Code
container. The proxy answers 403 on the CONNECT. The way through is the build-log recipe
in PROJECT_GUIDE section 4, which was used twice on 2026-08-30 and works:

1. Add a temporary `app/api/vendor-probe/route.ts` with `export const dynamic = 'force-static'`
2. Push to the branch. A prerendered route executes during `next build`, so its
   `console.log` lands in the build log
3. Read it with the Vercel MCP `get_deployment_build_logs`, filtering for `[probe]`
4. **Delete the route in the follow-up commit**

Build logs need no auth. Preview deploys sit behind Vercel Authentication, which rejects
at the edge before the function runs, so neither the response nor a runtime log is
reachable. The build log is the only channel.

Print from the probe: row count, the `merchant_category` histogram, which of **our**
categories they land in via `categorize()`, the kid-safety drop count, and 25 real product
names. The names matter more than the counts, for the reason in section 5.

Also run `pnpm run check`. Do not trust `pnpm build` as a typecheck: `next.config.mjs` sets
`typescript.ignoreBuildErrors: true`.

---

## 5. The decision that is still open, and must not be skipped

**Do personalised photo gifts belong on a kawaii shelf at all?**

Nobody has answered this and the histogram will not answer it. GiftLAB sell custom face
socks, photo blankets, printed mugs and photo calendars. That is a different market from a
plushie. 2,426 products would be roughly 35% of the catalogue, so this is not a small
cosmetic question.

The precedent is on the record twice. Autoplush's plush cars were excluded from the
plushies guide on 2026-08-30 for being genuinely plush and genuinely not kawaii. Plushible's
NASCAR and college licences were excluded before that. Section 4e's rule is that a page
which gets pinned is the public face of the brand.

Three options, in the order they should be considered:

1. **A showcase page**, the way BRKOX has one (`VendorConfig.showcase`). BRKOX got it for
   exactly this reason: a real partner whose stock does not belong scattered through a grid
   of plushies. This is the recommended default.
2. **Scatter through the grid.** Cheapest, and it reshapes what the site looks like. If this
   is chosen, expect to need `exclude` lists and probably a `forceCat`.
3. **Take the partnership without ingesting it.** A link, not a catalogue.

**Bring Jacob the real category split and 25 product names before recommending one.**
Do not decide it alone, and do not build past this point without an answer, because option 1
and option 2 are different builds.

---

## 6. Hard rules that apply here

From PROJECT_GUIDE section 7, all of which this task can trip over:

- The `pending` flag comes off only when **both** halves are done: a feed that has been read
  **and** a real tracking value. GiftLAB has the tracking (`awinMerchantId: '95201'`). It
  does not yet have a read feed. Do not clear the flag early.
- `commissionPct` stays `0` until the rate is confirmed in the AWIN dashboard. The programme
  description claims 10-15%, which is a lead, not a number to quote. MamaRaya and BRKOX are
  both `0` for the same reason.
- Never commit the feed URL, the API key, or any `.env*` file.
- Never import `lib/partners.ts` from a client component.
- Do not add product URLs to the sitemap.
- Do not let `/api/` become crawlable.

---

## 7. Definition of done

- [ ] `AWIN_FEEDS` set in Vercel, production and preview
- [ ] `lib/awin-feed.ts` reads, parses and maps the feed
- [ ] `aw_deep_link` is not double-wrapped by `affiliateUrl()`
- [ ] Cache key bumped to `v8` in the same commit as the mapping change
- [ ] Probed via the build log: real counts, real category split, 25 real names, and the
      probe route deleted afterwards
- [ ] Jacob has answered the section 5 question and the build matches the answer
- [ ] `pnpm run check` clean
- [ ] `pending` removed from the GiftLAB row **only after** all of the above
- [ ] `GET /api/catalog?debug` shows GiftLAB `ok: true` with a sane count
- [ ] PROJECT_GUIDE section 4c and the vendor table updated with what was measured
- [ ] This file deleted, because a finished task brief is just stale documentation

---

## 8. Current state, so you know what you are walking into

Committed on `main` as of `bf76691`:

- The GiftLAB row exists in `lib/data.ts` with `pending: true`, `network: 'awin'`,
  `awinMerchantId: '95201'`, `prefix: 'glab'`, `commissionPct: 0`
- A long comment above it records the Cloudflare measurement, so nobody repeats it
- PROJECT_GUIDE section 4c has the "on our network and still unreadable" note, and the
  vendor table has a GiftLAB row
- The temporary probe route has been deleted, as intended

Nothing is half-built. `getCatalog()` skips pending vendors and logs that it did, and
`?debug` lists them, so the site is in a clean state while this waits.
