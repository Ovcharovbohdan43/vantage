import { apiFetch } from '@/lib/api/client'
import { publicApiFetch } from '@/lib/api/public'

export interface BlogPostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  tags: string[]
  view_count: number
  upvote_count: number
  downvote_count: number
  published_at: string | null
  status?: string | null
}

export interface BlogPost extends BlogPostSummary {
  body_md: string
  seo: Record<string, unknown>
  status: string
  created_at: string
  updated_at: string
  user_vote?: number | null
}

export interface BlogListResponse {
  items: BlogPostSummary[]
  total: number
  can_publish: boolean
}

export interface BlogPostInput {
  title: string
  excerpt: string
  body_md: string
  tags: string[]
  slug?: string
  status: 'draft' | 'published'
}

export function listBlogPosts(params?: {
  q?: string
  limit?: number
  offset?: number
  include_drafts?: boolean
}) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.offset) search.set('offset', String(params.offset))
  if (params?.include_drafts) search.set('include_drafts', 'true')
  const qs = search.toString()
  return publicApiFetch<BlogListResponse>(`/api/v1/blog/posts${qs ? `?${qs}` : ''}`, {
    revalidate: 60,
  })
}

export function getBlogPost(slug: string, visitorId?: string) {
  const qs = visitorId ? `?visitor_id=${encodeURIComponent(visitorId)}` : ''
  return publicApiFetch<BlogPost>(`/api/v1/blog/posts/${slug}${qs}`, { revalidate: 60 })
}

export function recordBlogView(slug: string) {
  return publicApiFetch<BlogPost>(`/api/v1/blog/posts/${slug}/view`, { method: 'POST' })
}

export function voteBlogPost(slug: string, vote: -1 | 0 | 1, visitorId: string) {
  return publicApiFetch<BlogPost>(`/api/v1/blog/posts/${slug}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote, visitor_id: visitorId }),
  })
}

export function canPublishBlog() {
  return apiFetch<{ can_publish: boolean }>('/api/v1/blog/can-publish')
}

export function createBlogPost(payload: BlogPostInput) {
  return apiFetch<BlogPost>('/api/v1/blog/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBlogPost(slug: string, payload: Partial<BlogPostInput>) {
  return apiFetch<BlogPost>(`/api/v1/blog/posts/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteBlogPost(slug: string) {
  return apiFetch<void>(`/api/v1/blog/posts/${slug}`, { method: 'DELETE' })
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'blog_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
