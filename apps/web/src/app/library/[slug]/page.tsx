import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LibraryArticleView } from '@/components/library/library-article-view'
import { getLibraryArticle } from '@/lib/api/library'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const article = await getLibraryArticle(slug)
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

  let article: Awaited<ReturnType<typeof getLibraryArticle>>
  try {
    article = await getLibraryArticle(slug)
  } catch {
    notFound()
  }

  const jsonLd = article.seo.json_ld

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/library" className="text-sm text-zinc-400 hover:text-zinc-700 mb-6 inline-block">
        Research Library
      </Link>

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
