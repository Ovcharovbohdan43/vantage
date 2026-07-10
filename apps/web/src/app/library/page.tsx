import { Suspense } from 'react'
import { LibraryIndexClient } from '@/components/library/library-index-client'
import { listLibraryArticles } from '@/lib/api/library'

export const metadata = {
  title: 'Research Library — Real Customer Pain Analysis',
  description:
    'Browse market research built from real negative software reviews. Customer pain points, saturation signals, and opportunities — updated continuously.',
}

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function param(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}

interface LibraryPageProps {
  searchParams: Promise<SearchParams>
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const sp = await searchParams
  const q = param(sp.q).trim()
  const category = param(sp.category)
  const saturation = param(sp.saturation)
  const sort = (param(sp.sort) as 'latest' | 'popular' | 'reviews') || 'latest'

  let items: Awaited<ReturnType<typeof listLibraryArticles>>['items'] = []
  let total = 0
  let categories: string[] = []

  try {
    const data = await listLibraryArticles({
      q: q || undefined,
      category: category || undefined,
      saturation: saturation || undefined,
      sort,
      limit: 24,
    })
    items = data.items
    total = data.total
    categories = data.categories
  } catch {
    // API may be unavailable during local setup
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-950 mb-2">Research Library</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          A living archive of market pain research — built from real negative reviews on G2 and
          Capterra. Not a blog. Evidence you can verify.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-400">Loading library…</p>}>
        <LibraryIndexClient
          items={items}
          total={total}
          categories={categories}
          filters={{ q, category, saturation, sort }}
        />
      </Suspense>
    </div>
  )
}
