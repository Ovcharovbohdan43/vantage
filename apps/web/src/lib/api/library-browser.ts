import { createClient } from '@/lib/supabase/client'
import type { LibraryReview, LibraryReviewsResponse } from '@/lib/api/library'

/** Browser-side evidence load via Supabase RLS (published articles only). */
export async function getLibraryReviewsFromBrowser(
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
  const supabase = createClient()
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
