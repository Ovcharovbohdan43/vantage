'use client'

import { ExternalLink } from 'lucide-react'
import type { ReportCompetitor, ReportPainCluster } from '@/lib/api/types'

interface ReportCompetitorsSectionProps {
  competitors: ReportCompetitor[]
  isPreview: boolean
}

export function ReportCompetitorsSection({ competitors, isPreview }: ReportCompetitorsSectionProps) {
  if (competitors.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">
        Competitors ({competitors.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {competitors.map((competitor) => (
          <div key={competitor.id} className="border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-zinc-950">{competitor.name}</h3>
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-zinc-700 shrink-0"
                aria-label={`Open ${competitor.name}`}
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <dt className="text-zinc-400 font-mono uppercase text-[10px]">Rating</dt>
                <dd className="font-medium tabular-nums">
                  {competitor.rating != null ? `${competitor.rating.toFixed(1)} ★` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400 font-mono uppercase text-[10px]">Reviews</dt>
                <dd className="font-medium tabular-nums">
                  {competitor.reviews_count?.toLocaleString() ?? '—'}
                </dd>
              </div>
              {!isPreview && competitor.negative_reviews_count != null && (
                <div className="col-span-2">
                  <dt className="text-zinc-400 font-mono uppercase text-[10px]">Negative reviews</dt>
                  <dd className="font-medium tabular-nums text-red-700">
                    {competitor.negative_reviews_count.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
            {!isPreview && (competitor.top_complaints?.length ?? 0) > 0 && (
              <div className="border-t border-zinc-100 pt-3">
                <p className="text-[10px] font-mono uppercase text-zinc-400 mb-2">Top complaints</p>
                <ul className="space-y-1.5">
                  {competitor.top_complaints!.map((complaint, i) => (
                    <li key={i} className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                      &ldquo;{complaint}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function ReportCustomerVoicePreview({
  clusters,
  isPreview,
  onViewAll,
}: {
  clusters: ReportPainCluster[]
  isPreview: boolean
  onViewAll: () => void
}) {
  if (isPreview || clusters.length === 0) return null

  const quotes = clusters
    .flatMap((cluster) =>
      cluster.quotes.map((q) => ({
        ...q,
        category: cluster.title,
      })),
    )
    .slice(0, 3)

  if (quotes.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Customer voice</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-zinc-950 underline underline-offset-2"
        >
          View all evidence
        </button>
      </div>
      <p className="text-sm text-zinc-500 mb-4">Real quotes — AI didn&apos;t invent these.</p>
      <div className="space-y-0 divide-y divide-zinc-200 border border-zinc-200 bg-white">
        {quotes.map((quote, i) => (
          <QuoteCard key={i} quote={quote} />
        ))}
      </div>
    </section>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm tracking-wider" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      <span className="text-zinc-200">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  )
}

export function QuoteCard({
  quote,
}: {
  quote: {
    text: string
    rating: number | null
    competitor: string | null
    source: string | null
    category?: string
  }
}) {
  return (
    <blockquote className="p-5">
      {quote.rating != null && (
        <div className="mb-3">
          <StarRow rating={quote.rating} />
        </div>
      )}
      <p className="text-sm text-zinc-800 leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase text-zinc-400">
        {quote.category && (
          <div>
            <dt className="mb-0.5">Category</dt>
            <dd className="text-zinc-700 normal-case text-xs">{quote.category}</dd>
          </div>
        )}
        {quote.competitor && (
          <div>
            <dt className="mb-0.5">Competitor</dt>
            <dd className="text-zinc-700 normal-case text-xs">{quote.competitor}</dd>
          </div>
        )}
      </dl>
    </blockquote>
  )
}
