import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <p className="mb-2 font-mono text-xs uppercase tracking-wider text-zinc-500">404</p>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight text-zinc-950">Page not found</h1>
      <p className="mb-8 text-sm leading-relaxed text-zinc-600">
        That URL is not in the index. Try the home page or Research Library.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white"
        >
          Home
        </Link>
        <Link
          href="/library"
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-zinc-950"
        >
          Research Library
        </Link>
      </div>
    </main>
  )
}
