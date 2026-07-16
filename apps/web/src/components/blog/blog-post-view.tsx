'use client'

import { useEffect, useState } from 'react'
import { ArrowBigDown, ArrowBigUp, Eye, Pencil } from 'lucide-react'
import Link from 'next/link'
import { BlogMarkdown } from '@/components/blog/blog-markdown'
import {
  getOrCreateVisitorId,
  recordBlogView,
  voteBlogPost,
  type BlogPost,
} from '@/lib/api/blog'
import { cn } from '@/lib/utils'

interface BlogPostViewProps {
  post: BlogPost
  canEdit?: boolean
}

export function BlogPostView({ post: initial, canEdit = false }: BlogPostViewProps) {
  const [post, setPost] = useState(initial)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    let cancelled = false
    recordBlogView(initial.slug)
      .then((updated) => {
        if (!cancelled) setPost((prev) => ({ ...prev, view_count: updated.view_count }))
      })
      .catch(() => {
        // non-blocking
      })
    return () => {
      cancelled = true
    }
  }, [initial.slug])

  async function castVote(next: 1 | -1) {
    if (voting) return
    setVoting(true)
    try {
      const visitorId = getOrCreateVisitorId()
      const current = post.user_vote
      const payload = current === next ? 0 : next
      const updated = await voteBlogPost(post.slug, payload, visitorId)
      setPost(updated)
    } finally {
      setVoting(false)
    }
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <article>
      <header className="mb-8 border-b border-white/[0.06] pb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-v-on sm:text-3xl">{post.title}</h1>
        {post.excerpt && (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-v-muted">{post.excerpt}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {date && (
            <time dateTime={post.published_at ?? undefined} className="text-sm text-v-muted">
              {date}
            </time>
          )}
          <span className="inline-flex items-center gap-1.5 font-landing-mono text-[11px] tabular-nums text-v-muted">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {post.view_count.toLocaleString()} views
          </span>
          {canEdit && (
            <Link
              href={`/blog/${post.slug}/edit`}
              className="inline-flex items-center gap-1.5 text-sm text-v-primary hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Link>
          )}
        </div>

        {/* Stripe-style metric strip + GitHub-style vote controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.02]">
            <button
              type="button"
              disabled={voting}
              onClick={() => castVote(1)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]',
                post.user_vote === 1 ? 'text-v-primary' : 'text-v-muted',
              )}
              aria-pressed={post.user_vote === 1}
            >
              <ArrowBigUp className="h-4 w-4" aria-hidden />
              <span className="font-landing-mono text-[12px] tabular-nums">
                {post.upvote_count.toLocaleString()}
              </span>
            </button>
            <div className="w-px bg-white/[0.08]" aria-hidden />
            <button
              type="button"
              disabled={voting}
              onClick={() => castVote(-1)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]',
                post.user_vote === -1 ? 'text-v-error' : 'text-v-muted',
              )}
              aria-pressed={post.user_vote === -1}
            >
              <ArrowBigDown className="h-4 w-4" aria-hidden />
              {post.downvote_count > 0 && (
                <span className="font-landing-mono text-[12px] tabular-nums">
                  {post.downvote_count.toLocaleString()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <BlogMarkdown source={post.body_md} />
    </article>
  )
}
