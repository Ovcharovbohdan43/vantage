'use client'

import Link from 'next/link'
import type { LibraryArticleSummary } from '@/lib/api/library'

const SATURATION_STYLES: Record<string, string> = {
  HIGH: 'text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/25',
  MEDIUM: 'text-[#ffcc80] bg-[#ffcc80]/10 border-[#ffcc80]/25',
  LOW: 'text-[#4edea3] bg-[#4edea3]/10 border-[#4edea3]/25',
}

interface LibraryArticleCardProps {
  article: LibraryArticleSummary
}

export function LibraryArticleCard({ article }: LibraryArticleCardProps) {
  const satStyle =
    SATURATION_STYLES[article.market_saturation] ?? 'text-[#cbc3d7] bg-white/5 border-white/10'
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
      className="group block rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-5 transition-all hover:border-[#d0bcff]/40 hover:bg-[#201f22] hover:shadow-[0_0_28px_rgba(208,188,255,0.08)]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
          {article.category}
        </span>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${satStyle}`}>
          {article.market_saturation} saturation
        </span>
      </div>
      <h2 className="mb-2 text-base font-semibold leading-snug text-[#e5e1e4] underline-offset-2 group-hover:text-[#d0bcff] group-hover:underline">
        {article.title}
      </h2>
      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[#cbc3d7]">
        {article.executive_summary}
      </p>
      <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wide text-[#958ea0]">
        <span>{article.products_count} products</span>
        <span>{article.reviews_count} reviews</span>
        {date && <span>{date}</span>}
        {article.view_count > 0 && <span>{article.view_count} views</span>}
      </div>
    </Link>
  )
}
