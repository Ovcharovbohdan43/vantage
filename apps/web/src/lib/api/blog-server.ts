import { createClient } from '@/lib/supabase/server'
import { resolveApiOrigin } from '@/lib/api/origin'
import type { BlogListResponse, BlogPost } from '@/lib/api/blog'

async function serverBlogFetch<T>(path: string): Promise<T | null> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const base = resolveApiOrigin()

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    const response = await fetch(`${base}${path}`, {
      headers,
      next: { revalidate: 30 },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function listBlogPostsServer(params?: {
  q?: string
  include_drafts?: boolean
}) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  search.set('limit', '50')
  if (params?.include_drafts) search.set('include_drafts', 'true')
  const qs = search.toString()
  return serverBlogFetch<BlogListResponse>(`/api/v1/blog/posts?${qs}`)
}

export async function getBlogPostServer(slug: string) {
  return serverBlogFetch<BlogPost>(`/api/v1/blog/posts/${slug}`)
}
