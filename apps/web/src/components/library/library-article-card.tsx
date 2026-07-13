'use client'

import Link from 'next/link'
import type { LibraryArticleSummary } from '@/lib/api/library'
import { cn } from '@/lib/utils'

const SATURATION_DOT: Record<string, string> = {
  HIGH: 'bg-v-error',
  MEDIUM: 'bg-v-warn',
  LOW: 'bg-v-tertiary',
}

interface LibraryArticleCardProps {
  article: LibraryArticleSummary
}

/** GitHub-style repo/issue row — dense list item, not a marketing card. */
export function LibraryArticleCard({ article }: LibraryArticleCardProps) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Link
      href={`/library/${article.slug}`}
      className="group grid gap-2 px-1 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
    >
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
            {article.category}
          </span>
          <span className="inline-flex items-center gap-1.5 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                SATURATION_DOT[article.market_saturation] ?? 'bg-v-muted',
              )}
              aria-hidden
            />
            {article.market_saturation} sat
          </span>
        </div>
        <h2 className="text-[15px] font-semibold leading-snug text-v-on group-hover:underline group-hover:underline-offset-2">
          {article.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-v-muted">
          {article.executive_summary}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-landing-mono text-[11px] tabular-nums text-v-muted sm:flex-col sm:items-end sm:gap-1">
        <span>{article.products_count} products</span>
        <span>{article.reviews_count.toLocaleString()} reviews</span>
        {article.view_count > 0 && <span>{article.view_count.toLocaleString()} views</span>}
        {date && <span>{date}</span>}
      </div>
    </Link>
  )
}
