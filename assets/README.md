# Brand artwork

Put the two illustrated marks here:

    assets/logo-cat.png
    assets/logo-panda.png

`.jpg`, `.jpeg` and `.webp` also work — the script matches on the name, not the
extension.

Then run:

    pnpm icons

That regenerates **everything** from these two files: the favicon (16/32), the
browser tab icon, the Apple home-screen icon, the PWA icons (192/512), the
social-card image, and the logo chip in the header, mobile menu and footer.
No code changes needed anywhere.

## What the script does to them

- **Trims** the surrounding empty space.
- **Removes a white background** by flooding inward from the edges, so only
  white *connected to the border* is cleared. Interior white survives — the
  panda's face, the cat's fangs, the highlights in both sets of eyes. A plain
  "delete all near-white pixels" would hollow the panda out completely.
- **Composites** onto the pastel gradient tile with rounded corners.
- **Small sizes use the cat alone**, cropped tight. Two faces in a 16px browser
  tab render as two grey blobs; one face still reads. That is measured, not a
  guess.

Transparent PNG is better than white-background if you have the choice — keying
leaves fur edges very slightly rough.

## Why they live here and not in `public/`

These are *sources*. Everything in `public/` that they produce is generated and
gets overwritten by `pnpm icons`, so editing those directly would be undone by
the next run.
