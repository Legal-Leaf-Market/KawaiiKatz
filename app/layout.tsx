import type { Metadata, Viewport } from 'next'
import { Baloo_2, Quicksand } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/lib/store'

const _baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
})

const _quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: '🐈‍⬛ Kawaii Katz 🐼 — Kawaii, Clever & Kind',
  description: 'Curated kawaii finds — plushies, stationery, kitchen, puzzles & more. Kawaii Katz discovers the best cute & clever things for every budget.',
  keywords: 'kawaii, plushies, cute gifts, kawaii shop, kawaii collectibles, stationery, kids toys',
  openGraph: {
    title: 'Kawaii Katz — Kawaii, Clever & Kind',
    description: 'Curated kawaii finds for every budget.',
    url: 'https://kawaiikatz.com',
    siteName: 'Kawaii Katz',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffb199',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${_baloo.variable} ${_quicksand.variable} bg-[#fffaf0]`}>
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
