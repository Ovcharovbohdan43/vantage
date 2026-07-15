import { apiFetch } from '@/lib/api/client'
import { publicApiFetch } from '@/lib/api/public'
import type { ShareDraft } from '@/lib/share-report'

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
  mention_count?: number | null
  share_pct?: number | null
  negative_share_pct?: number | null
  emotional_intensity?: number | null
  commercial_opportunity?: number | null
  trend?: 'growing' | 'flat' | 'declining' | null
  year_counts?: Array<{ year: number; count: number }>
  date_coverage?: number | null
  competitors?: Array<{ name: string; complaints: number }>
  top_terms?: Array<{ term: string; count: number }>
  feature_requests?: Array<{ label: string; count: number; examples?: string[] }>
  sub_themes?: Array<{ title: string; frequency: number; share_pct?: number | null }>
  why_opportunity?: string | null
  explanation: string
  why_critical: string
  quotes: LibraryPainQuote[]
  supporting_review_ids: string[]
}

export interface LibraryCompetitor {
  id: string
  name: string
  source: string
  rating: number | null
  reviews_count: number | null
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

export interface LibraryMvpFeature {
  name: string
  problem_solved: string
  solution: string
  evidence_cluster_ids: string[]
}

export interface LibraryMvpBlueprint {
  concept_name: string
  product_concept: string
  target_user: string
  value_proposition: string
  core_workflow: string[]
  features: LibraryMvpFeature[]
  in_scope: string[]
  out_of_scope: string[]
  success_metric: string
}

export interface LibraryArticleContent {
  dataset: LibraryDataset
  scores?: {
    market_score: number
    risk_score: number
    data_confidence: string
    confidence_pct: number
  }
  stats?: {
    pain_signals: number
    clusters_found: number
    major_problems: number
    negative_signals: number
    underserved_problems: number
  }
  market_saturation: {
    level: string
    competition_level: string
    explanation: string
  }
  pain_points: LibraryPainPoint[]
  competitors?: LibraryCompetitor[]
  market_opportunities: LibraryOpportunity[]
  risk_analysis: LibraryRiskItem[]
  final_takeaway: string
  mvp_blueprint?: LibraryMvpBlueprint
  generation?: {
    version: string
    numeric_source: string
  }
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

export function generateLibraryShareDraft(slug: string, entitlementId: string) {
  return apiFetch<ShareDraft>(`/api/v1/library/${slug}/share-draft`, {
    method: 'POST',
    body: JSON.stringify({ entitlement_id: entitlementId }),
    cache: 'no-store',
  })
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
