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

## Priority 1: DONE

### `bunny.webp` — a clean bunny ✅

**Delivered 2026-08-30** in `08_decora_asset_sheet.png`. Full body, transparent,
ears intact, peace sign, deadpan. Exactly the ask. The cropped-from-concept-art
version is gone.

---

## Priority 2: DONE

All three arrived on the same asset sheet and are live:

| Filename | State |
|---|---|
| `trio.webp` | ✅ Katz, Bunny and Panda drawn as one composition. Replaced three cutouts butted together, which read as pasted because they were. |
| `divider.webp` | ✅ Bows, charms and safety pins on a string. Tiles horizontally between every section. |
| `hero-bg.webp` | ✅ Harajuku street. Sits behind the hero at 22% with a slight blur, as a texture rather than a picture. |

---

## Priority 3: DONE, and there are spares

The asset sheet carried about twenty transparent poses. Six are in use:

| Filename | Shows | Where |
|---|---|---|
| `st-katz.webp` | Katz, fluffy and sparkling | Hero row |
| `st-bunny.webp` | Bunny, deadpan, peace sign | Hero row, and The Edit |
| `st-panda.webp` | Panda in headphones | Hero row |
| `st-box.webp` | Katz and Panda in a parcel | Hero row |
| `st-bags.webp` | Bunny with more bags than she can hold | Beside "Bags and chaos" |
| `st-room.webp` | Bunny in a hoodie hugging a plush | Beside "Room loot" |

**Katz is a black cat, so every pose of him is dark**, and on a near-black hero
he vanished while the others read fine. The hero row now sits each pose on a
pale sticker chip, which fixes it once rather than hunting for a light Katz the
character cannot have.

**Still on the sheet, unused**, if you want them placed: panda with a donut,
bunny with shopping bags in colour, katz with flowers, panda hugging bunny,
bunny asleep in a blanket, katz peeking from a box. Also pattern swatches
(plaid, stripes, checkerboard, leopard), heart and polaroid frames, a bedroom
scene and a street scene with the trio. Say which and I will place them.

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

| File | Size | Source |
|---|---|---|
| `bunny.webp` | 556x900 | Asset sheet, transparent |
| `trio.webp` | 1100x631 | Asset sheet, transparent |
| `hero-bg.webp` | 1400x704 | Asset sheet |
| `divider.webp` | 1400x155 | Asset sheet, transparent, tiles |
| `st-*.webp` | ~300px tall | Asset sheet, transparent, six in use |
| `katz.webp` / `panda.webp` | ~760 tall | First pack, transparent. Kept as canonical face references |
| `duo.webp` | 900x900 | Katz and Panda profile. Not placed on the page |

About 1.3MB total. The only outstanding items are Priority 4 social sizes.
