import { publicApiFetch } from '@/lib/api/public'

export interface LibraryArticleSummary {
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
}

export interface LibraryListResponse {
  items: LibraryArticleSummary[]
  total: number
  categories: string[]
}

export interface LibraryArticle {
  id: string
  slug: string
  title: string
  category: string
  executive_summary: string
  content: LibraryArticleContent
  seo: LibrarySeo
  market_saturation: string
  competition_level: string
  products_count: number
  reviews_count: number
  view_count: number
  published_at: string | null
}

export interface LibraryDataset {
  products_analyzed: number
  reviews_analyzed: number
  sources: string[]
  rating_range: string
  analyzed_at?: string
}

export interface LibraryPainQuote {
  text: string
  rating: number
  source: string
  product: string
}

export interface LibraryPainPoint {
  cluster_id: string
  title: string
  frequency: number
  severity_score: number
  explanation: string
  why_critical: string
  quotes: LibraryPainQuote[]
  supporting_review_ids: string[]
}

export interface LibraryOpportunity {
  title: string
  body: string
}

export interface LibraryRiskItem {
  risk: string
  level: 'low' | 'medium' | 'high'
  explanation: string
}

export interface LibraryArticleContent {
  dataset: LibraryDataset
  market_saturation: {
    level: string
    competition_level: string
    explanation: string
  }
  pain_points: LibraryPainPoint[]
  market_opportunities: LibraryOpportunity[]
  risk_analysis: LibraryRiskItem[]
  final_takeaway: string
}

export interface LibrarySeo {
  title: string
  description: string
  slug: string
  canonical_url: string
  og_title: string
  og_description: string
  twitter_card: string
  json_ld: Record<string, unknown>
}

export interface LibraryReview {
  id: string
  rating: number | null
  text: string
  source: string
  product: string
  competitor_id: string
  cluster_ids: string[]
}

export interface LibraryReviewsResponse {
  items: LibraryReview[]
  total: number
}

export type LibraryEventType = 'view' | 'read_time' | 'cta_signup' | 'cta_research' | 'cta_purchase'

export interface LibraryListParams {
  q?: string
  category?: string
  saturation?: string
  min_reviews?: number
  min_products?: number
  sort?: 'latest' | 'popular' | 'reviews'
  limit?: number
  offset?: number
}

export function listLibraryArticles(params: LibraryListParams = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  if (params.saturation) search.set('saturation', params.saturation)
  if (params.min_reviews) search.set('min_reviews', String(params.min_reviews))
  if (params.min_products) search.set('min_products', String(params.min_products))
  if (params.sort) search.set('sort', params.sort)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset) search.set('offset', String(params.offset))
  const qs = search.toString()
  const isServer = typeof window === 'undefined'
  return publicApiFetch<LibraryListResponse>(`/api/v1/library${qs ? `?${qs}` : ''}`, {
    revalidate: params.q ? 0 : 60,
    cache: params.q || isServer ? 'no-store' : 'default',
  })
}

export function getLibraryArticle(slug: string) {
  return publicApiFetch<LibraryArticle>(`/api/v1/library/${slug}`, { revalidate: 120 })
}

export function getLibraryReviews(
  slug: string,
  params: {
    rating?: number
    cluster_id?: string
    competitor_id?: string
    q?: string
    limit?: number
    offset?: number
  } = {},
) {
  const search = new URLSearchParams()
  if (params.rating) search.set('rating', String(params.rating))
  if (params.cluster_id) search.set('cluster_id', params.cluster_id)
  if (params.competitor_id) search.set('competitor_id', params.competitor_id)
  if (params.q) search.set('q', params.q)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset) search.set('offset', String(params.offset))
  const qs = search.toString()
  return publicApiFetch<LibraryReviewsResponse>(`/api/v1/library/${slug}/reviews${qs ? `?${qs}` : ''}`)
}

export function trackLibraryEvent(
  slug: string,
  eventType: LibraryEventType,
  metadata: Record<string, unknown> = {},
) {
  return publicApiFetch<void>(`/api/v1/library/${slug}/events`, {
    method: 'POST',
    body: JSON.stringify({ event_type: eventType, metadata }),
    cache: 'no-store',
  })
}
