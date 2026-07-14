import type { MetadataRoute } from 'next'
import { listLibraryArticles } from '@/lib/api/library'
import { listLibraryArticlesFromSupabase } from '@/lib/api/library-supabase'
import { absoluteUrl } from '@/lib/seo/site'

export const revalidate = 3600

async function listPublishedSlugs(): Promise<{ slug: string; publishedAt: string | null }[]> {
  const pageSize = 100
  const articles: { slug: string; publishedAt: string | null }[] = []

  try {
    let offset = 0
    for (;;) {
      const data = await listLibraryArticlesFromSupabase({
        limit: pageSize,
        offset,
        sort: 'latest',
      })
      for (const item of data.items) {
        articles.push({ slug: item.slug, publishedAt: item.published_at })
      }
      offset += data.items.length
      if (data.items.length < pageSize || offset >= data.total) break
    }
    if (articles.length > 0) return articles
  } catch {
    // fall through to API
  }

  try {
    let offset = 0
    for (;;) {
      const data = await listLibraryArticles({ limit: pageSize, offset, sort: 'latest' })
      for (const item of data.items) {
        articles.push({ slug: item.slug, publishedAt: item.published_at })
      }
      offset += data.items.length
      if (data.items.length < pageSize || offset >= data.total) break
    }
  } catch {
    // empty sitemap articles is acceptable during build without secrets
  }

  return articles
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const articles = await listPublishedSlugs()

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/library'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/library/${article.slug}`),
    lastModified: article.publishedAt ? new Date(article.publishedAt) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticEntries, ...articleEntries]
}
