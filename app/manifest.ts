import type { MetadataRoute } from 'next'

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site'

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
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
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
    ],
  }
}
