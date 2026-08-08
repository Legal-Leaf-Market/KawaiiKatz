/** @type {import('next').NextConfig} */
const nextConfig = {
  // Three routes prerender the catalogue (/, /brkox, /api/catalog) and on a
  // cold build they run in parallel workers, so all three pay for a full
  // nine-vendor scrape plus the coco-ssd image scan before any cache exists.
  // That does not fit the 60s default. At runtime the per-vendor cache in
  // lib/catalog-source makes revalidation cheap; this only covers the cold
  // case. Still validated by Next's config schema, though it has fallen out
  // of the published docs.
  staticPageGenerationTimeout: 240,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
