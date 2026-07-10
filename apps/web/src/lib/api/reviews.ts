import { apiFetch } from '@/lib/api/client'

export interface ProjectReview {
  id: string
  competitor_id: string
  product: string
  source: string
  rating: number | null
  title: string | null
  text: string
  language: string | null
  review_date: string | null
  created_at: string
}

export interface ProjectReviewsResponse {
  items: ProjectReview[]
  total: number
  limit: number
  offset: number
}

export interface ProjectReviewsParams {
  rating?: number
  cluster_id?: string
  competitor_id?: string
  q?: string
  limit?: number
  offset?: number
}

export function getProjectReviews(
  projectId: string,
  params: ProjectReviewsParams = {},
): Promise<ProjectReviewsResponse> {
  const search = new URLSearchParams()
  if (params.rating != null) search.set('rating', String(params.rating))
  if (params.cluster_id) search.set('cluster_id', params.cluster_id)
  if (params.competitor_id) search.set('competitor_id', params.competitor_id)
  if (params.q) search.set('q', params.q)
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.offset != null) search.set('offset', String(params.offset))
  const qs = search.toString()
  return apiFetch<ProjectReviewsResponse>(`/api/v1/projects/${projectId}/reviews${qs ? `?${qs}` : ''}`)
}
