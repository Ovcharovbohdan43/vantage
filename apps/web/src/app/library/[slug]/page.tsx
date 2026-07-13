import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LibraryArticleView } from '@/components/library/library-article-view'
import { getLibraryArticleFromSupabase } from '@/lib/api/library-supabase'
import { getLibraryArticle } from '@/lib/api/library'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function loadArticle(slug: string) {
  try {
    const fromDb = await getLibraryArticleFromSupabase(slug)
    if (fromDb) return fromDb
  } catch (err) {
    console.error('[library] supabase article failed, trying API', err)
  }
  return getLibraryArticle(slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const article = await loadArticle(slug)
    const seo = article.seo
    return {
      title: seo.title,
      description: seo.description,
      alternates: { canonical: seo.canonical_url },
      openGraph: {
        title: seo.og_title,
        description: seo.og_description,
        url: seo.canonical_url,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.og_title,
        description: seo.og_description,
      },
    }
  } catch {
    return { title: 'Research not found' }
  }
}

export default async function LibraryArticlePage({ params }: PageProps) {
  const { slug } = await params

  let article: Awaited<ReturnType<typeof loadArticle>>
  try {
    article = await loadArticle(slug)
  } catch {
    notFound()
  }

  const jsonLd = article.seo.json_ld

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-5 sm:py-10 md:px-8">
      <nav className="mb-5 flex min-w-0 items-center gap-2 text-sm sm:mb-6" aria-label="Breadcrumb">
        <Link
          href="/library"
          className="shrink-0 text-v-muted transition-colors hover:text-v-on"
        >
          <span className="sm:hidden">Library</span>
          <span className="hidden sm:inline">Research Library</span>
        </Link>
        <span className="shrink-0 text-white/20">/</span>
        <span className="truncate text-v-on">{article.title}</span>
      </nav>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <LibraryArticleView article={article} />
    </div>
  )
}
