# Art brief: the Anime room

Everything here is **optional**. `/anime` is live and complete without a single
one of these files. The page checks at build time which assets exist and styles
itself either way, so a missing file is a plain gradient rather than a broken
image. Each row says what it adds, so you can do one, all, or none, in any order.

## How to hand art back

1. Generate it.
2. Drop the file in **`public/anime/`** in the GitHub repo, using the **exact
   filename** in the tables below.
3. Tell me it is there.

That is the whole handover. The filenames are already wired into the page, so a
file dropped at the right name **appears with no code change**. Anything with a
NEW filename needs one line from me to place it, so tell me which ones you added.

**Format:** PNG is fine, transparent where the table says transparent. I convert
to WebP and resize on my side, so do not optimise them first. Send the biggest
version you have.

---

## The three rules that matter

**1. Never letter the artwork.** No words, no logos, no category names baked into
an image. Every word on the page is HTML so it can be translated, searched, read
by a screen reader, and changed without regenerating a picture.

**2. Nothing may look like a shop's mascot.** The cast is Kawaii Katz's own. It
must never appear beside a retailer's name in a way that suggests they drew it or
endorsed it. This is why the page is called "Kawaii Katz Goes Anime" and not a
shop's name.

**3. No existing anime characters, ever.** This one is new and it is the reason
this room needs its own brief rather than a paragraph in the Decora one. The five
shops behind this page sell licensed merchandise, so their product photos are
full of characters somebody else owns. Our artwork must contain none of them: no
recognisable character, no series logo, no distinctive costume, hair silhouette,
weapon or emblem that identifies one. Draw **the genre**, not the shows.

What that means in practice, since "anime style" is doing real work here:

- Yes: cel shading, hard shadow terminators, thick clean linework, speed lines,
  halftone dot screens, dramatic rim light, sakura petals, a night city with
  neon signage that is pure shape and never readable text, tatami and shoji,
  a convention hall, a bedroom at 2am lit by a screen.
- No: anything a fan would name. If the answer to "which anime is that from" is
  anything but "none", regenerate it.

---

## Character consistency

The cast is the same three, drawn in this room's register. Use the canonical
references, which are already in the repo:

| Reference | Path |
|---|---|
| Katz, canonical | `public/decora/katz.webp` |
| Panda, canonical | `public/decora/panda.webp` |
| Bunny, canonical | `public/decora/bunny.webp` |

Paste this block into ChatGPT with the reference images attached, before any
specific prompt below:

> Use the attached images as strict visual references. Same characters, same eye
> shape, muzzle, ear proportions, fur silhouette, nose and palette. Change ONLY
> the rendering register: draw them as 2D cel-shaded anime rather than glossy 3D
> sticker art. Hard-edged shadow shapes, thick confident outlines of varying
> weight, flat colour fills, a single bright rim light, minimal gradients. Keep
> the enormous jewel eyes with white specular highlights. Do not include any
> existing anime character, series logo or recognisable costume.

**Katz** is a fluffy black/charcoal cat: pointed ears with pink inner ears,
violet-purple jewel eyes, tiny glossy pink nose, happy open mouth with pink
tongue and tiny fangs, long pale pink-white whiskers. He is chaos.

**Panda** is round and fluffy: black ears and eye patches, magenta-pink jewel
eyes, tiny black nose, happy mouth with pink tongue, pink blush. He is
unbothered.

**Bunny** is the editorial character: white/pale blush fur, long floppy ears,
pink-violet jewel eyes, **deadpan half-lidded unimpressed expression**. She is
unimpressed, never mean.

**Katz is a black cat, so every pose of him is dark.** The Decora room learned
this the hard way: on a dark hero he vanished while the other two read fine. If
this room's hero ends up dark I will sit the poses on pale chips again, but a
pose of Katz with a strong light rim solves it properly. Give him one.

---

## Priority 1: the hero

The page works today with a CSS gradient behind the title. This replaces it.

| Filename | Size | Transparent | What it shows |
|---|---|---|---|
| `hero-bg.webp` | 1400x704 | No | A backdrop, used as texture at low opacity behind the title. Not a picture to look at. |

Prompt direction: a night street under sakura, shot wide and slightly low, neon
signage reduced to coloured shape with **no readable characters of any script**,
wet tarmac holding the reflections, petals in the air. Cool magentas, violets and
teals so the existing palette sits on it. Keep the centre visually quiet: HTML
type goes there and it has to stay readable.

---

## Priority 2: the cast, and the divider

| Filename | Size | Transparent | What it shows |
|---|---|---|---|
| `trio.webp` | ~1100x630 | Yes | Katz, Bunny and Panda as ONE composition, drawn together, cel-shaded. Not three cutouts butted together, which reads as pasted because it is. |
| `divider.webp` | ~1400x155 | Yes | Tiles horizontally between sections. Speed lines, sakura petals and a few floating screentone dots on a transparent strip. |

---

## Priority 3: section stickers

Transparent cutouts, roughly 300px tall, one per shelf. They sit beside the
section heading. The page places any that exist and leaves a clean heading where
one is missing, so partial delivery is fine.

| Filename | Shows | Sits beside |
|---|---|---|
| `st-sleep.webp` | Panda asleep face-down in a duvet, one ear out | Bedding |
| `st-carry.webp` | Bunny with a backpack far too large for her, deadpan | Backpacks |
| `st-fit.webp` | Katz in an open bomber jacket, collar up, rim lit | Jackets and hoodies |
| `st-layer.webp` | Bunny in a haori over plain clothes, arms folded | Kimono |
| `st-build.webp` | Katz mid-panic over a half-finished jigsaw, one piece stuck to his paw | Puzzles |
| `st-new.webp` | Panda holding a parcel, sparkles | New arrivals |

The joke to keep: Katz is chaos, Panda is unbothered, Bunny is unimpressed. Every
pose should be able to carry one of those three without a caption.

---

## Priority 4: patterns

Seamless tiles, used at low opacity as section backgrounds. Each must tile
without a visible seam.

| Filename | Size | What |
|---|---|---|
| `pat-speed.webp` | 600x600 | Diagonal speed lines, single colour on transparent |
| `pat-tone.webp` | 400x400 | Halftone dot screen, the manga grey |
| `pat-sakura.webp` | 600x600 | Scattered petals, transparent |

---

## Priority 5: social

Not used on the site. For Pinterest and Instagram.

| Filename | Size | Use |
|---|---|---|
| `social-square.webp` | 1080x1080 | Instagram feed, Pinterest |
| `social-story.webp` | 1080x1920 | Stories, TikTok Photo Mode |
| `social-pin.webp` | 1000x1500 | Pinterest native ratio |

Leave the top ~15% and bottom ~20% of the story frame visually quiet: that is
where the platform puts its own caption and reply bar.

---

## What I am deliberately not asking for

- **Anything with words in it.** See rule 1. This includes Japanese text as
  decoration, which is the most tempting version of the mistake in this room.
- **A logo or wordmark.** "Kawaii Katz Goes Anime" is CSS type and stays that
  way, so it can be edited in a second.
- **Category badges.** Lovely, lettered, and the headings are HTML.
- **Product photography of any kind.** Every product image comes live from the
  shop's own catalogue. A generated product picture would be inventing stock we
  do not have, on a page whose whole claim is that the stock is real.
- **Any existing anime character.** Rule 3, and it is worth repeating at the
  bottom because it is the one an image model will break without being asked to.
