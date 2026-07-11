import { createClient } from '@/lib/supabase/server'
import type {
  LibraryArticle,
  LibraryArticleSummary,
  LibraryListParams,
  LibraryListResponse,
  LibraryReview,
  LibraryReviewsResponse,
} from '@/lib/api/library'

const LIBRARY_CATEGORIES = [
  'CRM',
  'Marketing',
  'Finance',
  'AI',
  'Productivity',
  'HR',
  'Analytics',
  'Developer Tools',
  'Cybersecurity',
  'Healthcare',
  'Education',
  'Design',
  'Other',
] as const

type ArticleRow = {
  id: string
  slug: string
  title: string
  category: string
  executive_summary: string
  market_saturation: string
  competition_level: string
  products_count: number
  reviews_count: number
  view_count: number
  published_at: string | null
  content?: LibraryArticle['content']
  seo?: LibraryArticle['seo']
  reviews_snapshot?: LibraryReview[]
}

function toSummary(row: ArticleRow): LibraryArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    executive_summary: row.executive_summary,
    market_saturation: row.market_saturation,
    competition_level: row.competition_level,
    products_count: row.products_count,
    reviews_count: row.reviews_count,
    view_count: row.view_count,
    published_at: row.published_at,
  }
}

/** Public library reads via Supabase RLS — does not depend on Railway API URL. */
export async function listLibraryArticlesFromSupabase(
  params: LibraryListParams = {},
): Promise<LibraryListResponse> {
  const supabase = await createClient()
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0

  let query = supabase
    .from('library_articles')
    .select(
      'id, slug, title, category, executive_summary, market_saturation, competition_level, products_count, reviews_count, view_count, published_at',
      { count: 'exact' },
    )
    .eq('status', 'published')

  if (params.category) query = query.eq('category', params.category)
  if (params.saturation) query = query.eq('market_saturation', params.saturation.toUpperCase())
  if (params.min_reviews) query = query.gte('reviews_count', params.min_reviews)
  if (params.min_products) query = query.gte('products_count', params.min_products)
  if (params.q?.trim()) {
    const term = params.q.trim()
    query = query.or(
      `title.ilike.%${term}%,executive_summary.ilike.%${term}%,category.ilike.%${term}%,slug.ilike.%${term}%`,
    )
  }

  if (params.sort === 'popular') {
    query = query.order('view_count', { ascending: false }).order('published_at', { ascending: false })
  } else if (params.sort === 'reviews') {
    query = query
      .order('reviews_count', { ascending: false })
      .order('published_at', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) throw new Error(error.message)

  return {
    items: ((data ?? []) as ArticleRow[]).map(toSummary),
    total: count ?? 0,
    categories: [...LIBRARY_CATEGORIES],
  }
}

export async function getLibraryArticleFromSupabase(slug: string): Promise<LibraryArticle | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('library_articles')
    .select(
      'id, slug, title, category, executive_summary, content, seo, market_saturation, competition_level, products_count, reviews_count, view_count, published_at',
    )
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as ArticleRow
  return {
    ...toSummary(row),
    content: row.content as LibraryArticle['content'],
    seo: row.seo as LibraryArticle['seo'],
  }
}

export async function getLibraryReviewsFromSupabase(
  slug: string,
  params: {
    rating?: number
    cluster_id?: string
    competitor_id?: string
    q?: string
    limit?: number
    offset?: number
  } = {},
): Promise<LibraryReviewsResponse> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('library_articles')
    .select('reviews_snapshot')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return { items: [], total: 0 }

  let reviews = (data.reviews_snapshot as LibraryReview[] | null) ?? []

  if (params.rating != null) {
    reviews = reviews.filter((r) => r.rating === params.rating)
  }
  if (params.cluster_id) {
    reviews = reviews.filter((r) => r.cluster_ids?.includes(params.cluster_id!))
  }
  if (params.competitor_id) {
    reviews = reviews.filter((r) => r.competitor_id === params.competitor_id)
  }
  if (params.q?.trim()) {
    const term = params.q.trim().toLowerCase()
    reviews = reviews.filter(
      (r) =>
        r.text?.toLowerCase().includes(term) || r.product?.toLowerCase().includes(term),
    )
  }

  const total = reviews.length
  const offset = params.offset ?? 0
  const limit = params.limit ?? 20
  return { items: reviews.slice(offset, offset + limit), total }
}
