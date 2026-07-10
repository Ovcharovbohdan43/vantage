'use client'

import Link from 'next/link'
import type { LibraryArticleSummary } from '@/lib/api/library'

const SATURATION_STYLES: Record<string, string> = {
  HIGH: 'text-red-700 bg-red-50',
  MEDIUM: 'text-amber-800 bg-amber-50',
  LOW: 'text-emerald-800 bg-emerald-50',
}

interface LibraryArticleCardProps {
  article: LibraryArticleSummary
}

export function LibraryArticleCard({ article }: LibraryArticleCardProps) {
  const satStyle = SATURATION_STYLES[article.market_saturation] ?? 'text-zinc-600 bg-zinc-100'
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
      className="block border border-zinc-200 p-5 hover:border-zinc-400 transition-colors group"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          {article.category}
        </span>
        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 ${satStyle}`}>
          {article.market_saturation} saturation
        </span>
      </div>
      <h2 className="text-base font-semibold text-zinc-950 group-hover:underline underline-offset-2 mb-2 leading-snug">
        {article.title}
      </h2>
      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3 mb-4">
        {article.executive_summary}
      </p>
      <div className="flex flex-wrap gap-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
        <span>{article.products_count} products</span>
        <span>{article.reviews_count} reviews</span>
        {date && <span>{date}</span>}
        {article.view_count > 0 && <span>{article.view_count} views</span>}
      </div>
    </Link>
  )
}
