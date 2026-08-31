/**
 * The skeleton that shows the moment somebody taps View item.
 *
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS
 *
 * Jacob: "it takes forever to load, and it's not always obvious that it ends
 * loading." Two complaints, and this answers the second one, which was the
 * worse of the two.
 *
 * /p/[id] renders on demand, so before this file existed a tap did NOTHING
 * visible: the browser sat on the old page, with the old page's content, until
 * the server answered. No spinner, no change, nothing to say a click had
 * registered. That reads as a broken button long before it reads as a slow one,
 * and it is why people tap twice.
 *
 * An App Router `loading.tsx` is served instantly from the client bundle while
 * the server work happens, so the navigation is immediate and obviously in
 * progress. It costs one small file and no runtime work.
 *
 * It deliberately MIRRORS the real page's layout - breadcrumb, square image,
 * title block, buttons, a similar strip - rather than being a spinner in the
 * middle of the screen. A skeleton that matches means nothing jumps when the
 * content lands.
 */
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-[#ffe6d9] ${className}`} />
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1080px] px-4 py-6">
      <Block className="mb-4 h-4 w-48" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="aspect-[4/5] animate-pulse rounded-[24px] border-[3px] border-[#ffb199] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea] opacity-60" />

        <div>
          <Block className="mb-3 h-4 w-28" />
          <Block className="mb-2 h-8 w-full" />
          <Block className="mb-5 h-8 w-3/4" />
          <Block className="mb-4 h-9 w-32" />
          <Block className="mb-2 h-4 w-full" />
          <Block className="mb-2 h-4 w-full" />
          <Block className="mb-6 h-4 w-2/3" />
          <Block className="mb-3 h-[52px] w-full" />
          <Block className="h-[52px] w-full" />
        </div>
      </div>

      <Block className="mb-4 mt-10 h-6 w-44" />
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-[230px] w-full" />
        ))}
      </div>

      {/* Announced once, politely, for anyone who cannot see the skeleton. */}
      <p className="sr-only" role="status">
        Loading this product
      </p>
    </main>
  )
}
