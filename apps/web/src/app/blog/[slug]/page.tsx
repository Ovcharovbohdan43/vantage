import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/json-ld'
import { BlogPostView } from '@/components/blog/blog-post-view'
import { getBlogPost } from '@/lib/api/blog'
import { getBlogPostServer } from '@/lib/api/blog-server'
import { createClient } from '@/lib/supabase/server'
import { isBlogOwner } from '@/lib/blog-owner'
import { absoluteUrl } from '@/lib/seo/site'
import { breadcrumbJsonLd, normalizeBlogPostJsonLd } from '@/lib/seo/structured-data'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function loadPost(slug: string) {
  const fromAuth = await getBlogPostServer(slug)
  if (fromAuth) return fromAuth
  try {
    return await getBlogPost(slug)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post) {
    return { title: 'Post not found', robots: { index: false, follow: false } }
  }

  const seo = post.seo as Record<string, string>
  const canonical = absoluteUrl(`/blog/${slug}`)
  const title = seo.title || post.title
  const description = seo.description || post.excerpt || post.title

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    authors: [{ name: 'Bohdan', url: absoluteUrl('/blog') }],
    openGraph: {
      title: seo.og_title || post.title,
      description: seo.og_description || description,
      url: canonical,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      images: [{ url: '/blog/author-avatar.png', width: 512, height: 512, alt: 'Bohdan' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.og_title || post.title,
      description: seo.og_description || description,
    },
    robots: {
      index: post.status === 'published',
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post || (post.status !== 'published' && post.status !== 'draft')) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const owner = isBlogOwner(user)

  if (post.status === 'draft' && !owner) {
    notFound()
  }

  const seoMeta = post.seo as Record<string, string | Record<string, unknown>>
  const description = (typeof seoMeta.description === 'string' ? seoMeta.description : null) || post.excerpt
  const jsonLd = normalizeBlogPostJsonLd(
    (seoMeta.json_ld as Record<string, unknown> | undefined) ?? null,
    {
    slug,
    title: post.title,
    description,
    publishedAt: post.published_at,
    updatedAt: post.updated_at,
  })

  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-5 sm:py-10 md:px-8">
      <nav className="mb-6 flex min-w-0 items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link href="/blog" className="shrink-0 text-v-muted transition-colors hover:text-v-on">
          Blog
        </Link>
        <span className="shrink-0 text-white/20">/</span>
        <span className="truncate text-v-on">{post.title}</span>
      </nav>

      <JsonLd data={jsonLd} />
      <JsonLd data={crumbs} />

      <BlogPostView post={post} canEdit={owner} />
    </div>
  )
}
