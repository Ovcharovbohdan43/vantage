import Link from 'next/link'
import { ArrowBigDown, ArrowBigUp, Eye } from 'lucide-react'
import type { BlogPostSummary } from '@/lib/api/blog'

interface BlogPostCardProps {
  post: BlogPostSummary
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const score = post.upvote_count - post.downvote_count

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid gap-3 border-b border-white/[0.06] px-1 py-5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6"
    >
      <div className="min-w-0">
        {post.status === 'draft' && (
          <span className="mb-2 inline-flex rounded border border-v-warn/30 bg-v-warn/10 px-2 py-0.5 font-landing-mono text-[10px] uppercase tracking-wider text-v-warn">
            Draft
          </span>
        )}
        <div className="mb-1.5 flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="text-[15px] font-semibold leading-snug text-v-on group-hover:underline group-hover:underline-offset-2 sm:text-base">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-v-muted">{post.excerpt}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 font-landing-mono text-[11px] tabular-nums text-v-muted sm:flex-col sm:items-end sm:gap-1.5">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          {post.view_count.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 text-v-on">
          <ArrowBigUp className="h-3.5 w-3.5" aria-hidden />
          {post.upvote_count.toLocaleString()}
        </span>
        {post.downvote_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <ArrowBigDown className="h-3.5 w-3.5" aria-hidden />
            {post.downvote_count.toLocaleString()}
          </span>
        )}
        {score !== post.upvote_count && (
          <span className="text-v-primary">score {score.toLocaleString()}</span>
        )}
        {date && <span>{date}</span>}
      </div>
    </Link>
  )
}
