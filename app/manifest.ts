import type { MetadataRoute } from 'next'

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/site'

/**
 * Both sister sites ship a full web manifest and treat the home-screen app as a
 * real delivery target rather than a nicety. Kawaii Katz had icons but no
 * manifest, so it was not installable at all.
 *
 * `start_url` carries ?src=pwa the same way the sister sites do, which is what
 * makes installed traffic separable in analytics later.
 *
 * Note the theme/background colours are read from the existing design — this is
 * plumbing, not a restyle.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    // short_name stays plain: it sits under the home-screen icon in a very
    // narrow label, where the emoji would push the actual words out.
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: '/',
    start_url: '/?src=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fffaf0',
    theme_color: '#ffb199',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
      // Android/Chrome install prompts want a real 192 and 512 raster; with only
      // the SVG and the 180 above, some launchers fall back to a screenshot of
      // the page instead of the icon.
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
    ],
  }
}
