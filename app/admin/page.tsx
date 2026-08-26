import type { Metadata } from 'next'
import Link from 'next/link'

import AdminDashboard from '@/components/AdminDashboard'

/**
 * The curator's dashboard.
 *
 * `noindex, nofollow` and absent from the sitemap. The PAGE is not gated, the
 * DATA is: /api/admin/stats checks the curator cookie and returns 401 without
 * it, and this page renders a sign-in prompt when it gets one. Same split as
 * /studio, for the same reason. Gating the route as well would mean a second
 * auth mechanism protecting a shell that contains nothing.
 */

export const metadata: Metadata = {
  title: 'Admin | Kawaii Katz',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <main className="max-w-[1180px] mx-auto px-4 py-6">
      <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
        <Link href="/" className="hover:underline">Kawaii Katz</Link>
        <span className="mx-1.5">›</span>
        <span>Admin</span>
      </nav>

      <header className="mb-5">
        <h1 className="font-display text-[30px] sm:text-[36px] text-[#4f4550] leading-tight">
          📊 What the site is doing
        </h1>
        <p className="text-[14.5px] text-[#6f6675] leading-relaxed mt-2 max-w-[70ch]">
          Which products people click, which shops they leave for, which parts of the site earn
          their keep, and where a workflow loses them.
        </p>
      </header>

      <AdminDashboard />
    </main>
  )
}
