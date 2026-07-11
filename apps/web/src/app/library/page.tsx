import { Suspense } from 'react'
import { LibraryIndexClient } from '@/components/library/library-index-client'
import { listLibraryArticlesFromSupabase } from '@/lib/api/library-supabase'
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

  const filters = {
    q: q || undefined,
    category: category || undefined,
    saturation: saturation || undefined,
    sort,
    limit: 24,
  }

  try {
    // Prefer Supabase (same prod DB, RLS) so the library does not depend on Railway API URL wiring.
    const data = await listLibraryArticlesFromSupabase(filters)
    items = data.items
    total = data.total
    categories = data.categories
  } catch (supabaseErr) {
    console.error('[library] supabase list failed, trying API', supabaseErr)
    try {
      const data = await listLibraryArticles(filters)
      items = data.items
      total = data.total
      categories = data.categories
    } catch (apiErr) {
      console.error('[library] API list failed', apiErr)
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-56 w-56 rounded-full bg-[#d0bcff]/10 blur-[100px]" />
      </div>

      <div className="mb-10 max-w-2xl">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[#e5e1e4]">Research Library</h1>
        <p className="text-sm leading-relaxed text-[#cbc3d7]">
          A living archive of market pain research — built from real negative reviews on G2 and
          Capterra. Not a blog. Evidence you can verify.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-[#958ea0]">Loading library…</p>}>
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
