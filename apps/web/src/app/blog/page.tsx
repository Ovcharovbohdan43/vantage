import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { JsonLd } from '@/components/seo/json-ld'
import { BlogAuthorWall } from '@/components/blog/blog-author-wall'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { listBlogPosts } from '@/lib/api/blog'
import { listBlogPostsServer } from '@/lib/api/blog-server'
import { createClient } from '@/lib/supabase/server'
import { isBlogOwner } from '@/lib/blog-owner'
import { absoluteUrl } from '@/lib/seo/site'
import { blogCollectionJsonLd } from '@/lib/seo/structured-data'
import { BlogIndexActions } from '@/components/blog/blog-index-actions'

const BLOG_TITLE = 'Vantage Blog — Startup research & building in public'
const BLOG_DESCRIPTION =
  'Essays on market validation, customer pain research, and shipping Vantage. Written by the founder — indexed for search, readable like Linear docs.'

export const metadata: Metadata = {
  title: { absolute: BLOG_TITLE },
  description: BLOG_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/blog') },
  openGraph: {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: absoluteUrl('/blog'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const owner = isBlogOwner(user)

  let items: Awaited<ReturnType<typeof listBlogPosts>>['items'] = []

  try {
    if (owner) {
      const data = await listBlogPostsServer({ include_drafts: true })
      items = data?.items ?? []
    } else {
      const data = await listBlogPosts({ limit: 50 })
      items = data.items
    }
  } catch (err) {
    console.error('[blog] list failed', err)
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-5 sm:py-10 md:px-8 md:py-12">
      <JsonLd data={blogCollectionJsonLd()} />
      <BlogAuthorWall />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-v-on sm:text-2xl">Posts</h1>
          <p className="mt-1 text-sm text-v-muted">
            {items.length > 0 ? `${items.length} on the wall` : 'Nothing published yet'}
          </p>
        </div>
        <Suspense fallback={null}>
          <BlogIndexActions canPublish={owner} />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-v-muted">
          The first post is coming soon. Follow along while we validate markets in public.
        </p>
      ) : (
        <div>
          {items.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <p className="mt-10 text-sm text-v-muted">
        Looking for evidence-backed research? Browse the{' '}
        <Link href="/library" className="text-v-primary hover:underline">
          Research Library
        </Link>
        .
      </p>
    </div>
  )
}
