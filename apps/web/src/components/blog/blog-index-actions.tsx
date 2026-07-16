'use client'

import Link from 'next/link'

export function BlogIndexActions({ canPublish }: { canPublish: boolean }) {
  if (!canPublish) return null
  return (
    <Link
      href="/blog/new"
      className="inline-flex h-9 items-center rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
    >
      New post
    </Link>
  )
}
