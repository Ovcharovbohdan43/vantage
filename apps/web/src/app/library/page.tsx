import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JsonLd } from '@/components/seo/json-ld'
import { LibraryIndexClient } from '@/components/library/library-index-client'
import { listLibraryArticlesFromSupabase } from '@/lib/api/library-supabase'
import { listLibraryArticles } from '@/lib/api/library'
import { absoluteUrl } from '@/lib/seo/site'
import { libraryCollectionJsonLd } from '@/lib/seo/structured-data'

const LIBRARY_TITLE = 'Research Library — Real Customer Pain Analysis'
const LIBRARY_DESCRIPTION =
  'Browse market research built from real negative software reviews. Customer pain points, saturation signals, and opportunities — updated continuously.'

export const metadata: Metadata = {
  title: { absolute: LIBRARY_TITLE },
  description: LIBRARY_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/library') },
  openGraph: {
    title: LIBRARY_TITLE,
    description: LIBRARY_DESCRIPTION,
    url: absoluteUrl('/library'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: LIBRARY_TITLE,
    description: LIBRARY_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
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
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-5 sm:py-10 md:px-8 md:py-12">
      <JsonLd data={libraryCollectionJsonLd()} />
      <div className="mb-6 max-w-2xl border-b border-white/[0.06] pb-6 sm:mb-8 sm:pb-8">
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-v-on sm:text-2xl">
          Research Library
        </h1>
        <p className="text-sm leading-relaxed text-v-muted md:text-[15px]">
          A living archive of market pain research — built from real negative reviews on G2 and
          Capterra. Not a blog. Evidence you can verify.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-v-muted">Loading library…</p>}>
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
