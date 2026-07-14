import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/json-ld'
import { LibraryArticleView } from '@/components/library/library-article-view'
import { getLibraryArticleFromSupabase } from '@/lib/api/library-supabase'
import { getLibraryArticle } from '@/lib/api/library'
import { libraryArticleUrl } from '@/lib/seo/site'
import { breadcrumbJsonLd, normalizeArticleJsonLd } from '@/lib/seo/structured-data'

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
    const canonical = libraryArticleUrl(slug)
    const title = seo.title || article.title
    const description = seo.description || article.executive_summary

    return {
      title: { absolute: title },
      description,
      alternates: { canonical },
      authors: [{ name: 'Vantage Research Library' }],
      openGraph: {
        title: seo.og_title || title,
        description: seo.og_description || description,
        url: canonical,
        type: 'article',
        siteName: 'Vantage',
        publishedTime: article.published_at ?? undefined,
        modifiedTime: article.published_at ?? undefined,
        images: [
          {
            url: '/opengraph-image',
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.og_title || title,
        description: seo.og_description || description,
        images: ['/twitter-image'],
      },
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    }
  } catch {
    return {
      title: 'Research not found',
      robots: { index: false, follow: false },
    }
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

  const description = article.seo.description || article.executive_summary
  const jsonLd = normalizeArticleJsonLd(article.seo.json_ld, {
    slug,
    title: article.title,
    description,
    publishedAt: article.published_at,
  })

  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Research Library', path: '/library' },
    { name: article.title, path: `/library/${slug}` },
  ])

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

      <JsonLd data={jsonLd} />
      <JsonLd data={crumbs} />

      <LibraryArticleView article={article} />
    </div>
  )
}
