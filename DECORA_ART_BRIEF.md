# Art brief: the Decora room

Everything here is **optional**. `/decora` is live and complete without a single
one of these. Each row says what it replaces or adds, so you can do one, all, or
none, in any order.

## How to hand art back

1. Generate it.
2. Drop the file in **`public/decora/`** in the GitHub repo, using the **exact
   filename** in the tables below.
3. Tell me it is there.

That is the whole handover. The filenames are already wired into the page, so a
file dropped at the right name **replaces the current asset with no code change**.
Anything with a NEW filename needs one line from me to place it, so tell me which
ones you added.

**Format:** PNG is fine, transparent where the table says transparent. I convert
to WebP and resize on my side, so do not optimise them first. Send the biggest
version you have.

---

## The two rules that matter

**1. Never letter the artwork.** No words, no logos, no category names baked into
an image. Every word on the page is HTML so it can be translated, searched,
read by a screen reader, and changed without regenerating a picture. The concept
sheet's lettering is exactly what we are not shipping.

**2. Nothing may look like a shop's mascot.** The bunny is Kawaii Katz's own
character. It must never appear beside a retailer's name in a way that suggests
they drew it or endorsed it. This is the one hard line in the original handoff
brief and it is why the page is called "Kawaii Katz Goes Decora" instead of a
shop's name.

---

## Character consistency

Use these as image references on every generation. They are already in the repo:

| Reference | Path |
|---|---|
| Katz, canonical | `public/decora/katz.webp` |
| Panda, canonical | `public/decora/panda.webp` |
| Bunny, current | `public/decora/bunny.webp` |

Paste this block into ChatGPT with the reference images attached, before any
specific prompt below:

> Use the attached images as strict visual references. Do not redesign eye
> shape, muzzle, ear proportions, fur silhouette, nose, highlight language or
> palette. Match the existing rendering: glossy chibi sticker art, thick clean
> outlines, enormous jewel eyes with white specular highlights and a pink heart
> reflection, soft airbrushed fur shading. Same character, new pose.

**Katz** is a fluffy black/charcoal cat: pointed ears with pink inner ears,
violet-purple jewel eyes, tiny glossy pink nose, happy open mouth with pink
tongue and tiny fangs, long pale pink-white whiskers.

**Panda** is round and fluffy: black ears and eye patches, magenta-pink jewel
eyes, tiny black nose, happy mouth with pink tongue, pink blush.

**Bunny** is the editorial character: white/pale blush fur, long floppy ears,
pink-violet jewel eyes, **deadpan half-lidded unimpressed expression**,
overloaded decora clips and charms, black and hot-pink fashion base.
Fashionably grumpy, never mean. The running joke is that Katz is chaos, Panda is
unbothered, and Bunny is unimpressed.

---

## Priority 1: the one that actually matters

### `bunny.webp` — a clean bunny

**Replaces** the current file, which I cropped out of the concept sheet. It works,
but it carries background: cherry blossom, a street lamp, and Katz's paw at the
lower left. In the hero it sits inside a white sticker frame so the crop reads as
intentional, which is why this is a polish job rather than a bug.

- **Transparent background**, no scene behind her
- Full body, standing, roughly 3:4 portrait
- Peace sign is good, it is in the current one and reads well
- Ears fully in frame, nothing cropped

> Full-body chibi sticker illustration of an original character: a fashionably
> grumpy white bunny with long floppy ears and a deadpan half-lidded expression,
> loaded with decora accessories, black and hot-pink striped top, plaid skirt,
> layered charm necklaces and bracelets, hair clips all over her ears, making a
> peace sign. Glossy chibi sticker art, thick clean outlines, enormous
> pink-violet jewel eyes with white highlights and a pink heart reflection.
> **Fully transparent background. No text, no logos, no background scene.**
> Full body, nothing cropped.

---

## Priority 2: things the page has no asset for

These would each get a real slot. Nothing breaks without them.

| Filename | What it is | Notes |
|---|---|---|
| `trio.webp` | Katz, Bunny, Panda together, one composition | **Transparent.** Would replace the three separate hero cutouts with one properly composed group, which fixes the slight "pasted side by side" look. Bunny centre and tallest. |
| `divider.webp` | A wide, short decorative strip | ~2400x200, transparent. Charms, safety pins, beads, stars, bows on a string. Sits between sections. |
| `hero-bg.webp` | Wide Harajuku street backdrop | ~2400x1000. Blurred, low contrast, **no characters and no text** — it sits behind the headline, so it must not compete. Currently a CSS checkerboard, which is fine. |

---

## Priority 3: reaction stickers

The page uses four, cropped from the concept sheet's bottom row. They are
serviceable but sit on a pale lavender rectangle rather than being transparent.

**Transparent, roughly square, thick white sticker border**, about 400x400.

| Filename | Character | Expression |
|---|---|---|
| `st-omg.webp` | Katz | Delighted, mouth open, sparkling eyes |
| `st-bunny.webp` | Bunny | Deadpan side-eye |
| `st-panda.webp` | Panda | Serene, unbothered, hearts |
| `st-need.webp` | Bunny | Wide-eyed wanting it |

Extras, if you enjoy making them. Tell me the names you use and I will place them:

`st-sideeye` · `st-hearteyes` · `st-outfitcheck` · `st-parcel` (Bunny holding a
parcel) · `st-boba` (Panda with boba, it is in the concept sheet already)

> Die-cut sticker of [CHARACTER] with a [EXPRESSION] expression, glossy chibi
> sticker art, thick white sticker border with a soft drop shadow.
> **Fully transparent background outside the white border. No text.**

---

## Priority 4: social

Not used on the site. For Pinterest and Instagram, and worth having before the
room gets pushed anywhere.

| Filename | Size | Use |
|---|---|---|
| `social-square.webp` | 1080x1080 | Instagram feed, Pinterest |
| `social-story.webp` | 1080x1920 | Stories, TikTok Photo Mode |
| `social-pin.webp` | 1000x1500 | Pinterest native ratio |

Leave the top ~15% and bottom ~20% of the story frame visually quiet: that is
where the platform puts its own caption and reply bar. Same rule the carousel
exporter follows.

---

## What I am deliberately not asking for

- **Anything with words in it.** See rule 1.
- **A logo or wordmark.** "Kawaii Katz Goes Decora" is CSS type and should stay
  that way, so it can be edited in a second.
- **Category badges** like the concept sheet's NEW ARRIVALS / CLOTHING tiles.
  They are lovely and they are lettered, and the section headings are HTML.
- **Product photography of any kind.** Every product image comes live from the
  shop's own catalogue. A generated product picture would be inventing stock.

---

## Current state, for reference

Everything below is live now and works. This brief is upgrades, not repairs.

| File | Size | Source |
|---|---|---|
| `katz.webp` | 814x760 | Supplied pack, transparent, trimmed |
| `panda.webp` | 834x760 | Supplied pack, transparent, trimmed |
| `bunny.webp` | 481x760 | **Cropped from the concept sheet.** Priority 1 above |
| `duo.webp` | 900x900 | Katz and Panda profile. Not currently placed on the page |
| `st-*.webp` | ~170x200 | Cropped from the concept sheet's sticker row |

Total 552KB, down from 13MB of source PNGs.
