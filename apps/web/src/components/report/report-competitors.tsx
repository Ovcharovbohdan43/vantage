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
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
        Competitors ({competitors.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {competitors.map((competitor) => (
          <div
            key={competitor.id}
            className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4 transition-colors hover:border-[#d0bcff]/25"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#e5e1e4]">{competitor.name}</h3>
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[#958ea0] transition-colors hover:text-[#d0bcff]"
                aria-label={`Open ${competitor.name}`}
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="font-mono text-[10px] uppercase text-[#958ea0]">Rating</dt>
                <dd className="font-medium tabular-nums text-[#e5e1e4]">
                  {competitor.rating != null ? `${competitor.rating.toFixed(1)} ★` : '—'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase text-[#958ea0]">Reviews</dt>
                <dd className="font-medium tabular-nums text-[#e5e1e4]">
                  {competitor.reviews_count?.toLocaleString() ?? '—'}
                </dd>
              </div>
              {!isPreview && competitor.negative_reviews_count != null && (
                <div className="col-span-2">
                  <dt className="font-mono text-[10px] uppercase text-[#958ea0]">Negative reviews</dt>
                  <dd className="font-medium tabular-nums text-[#ff8adf]">
                    {competitor.negative_reviews_count.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
            {!isPreview && (competitor.top_complaints?.length ?? 0) > 0 && (
              <div className="border-t border-white/8 pt-3">
                <p className="mb-2 font-mono text-[10px] uppercase text-[#958ea0]">Top complaints</p>
                <ul className="space-y-1.5">
                  {competitor.top_complaints!.map((complaint, i) => (
                    <li key={i} className="line-clamp-2 text-xs leading-relaxed text-[#cbc3d7]">
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
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">Customer voice</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-[#d0bcff] underline underline-offset-2 transition-colors hover:text-[#e5e1e4]"
        >
          View all evidence
        </button>
      </div>
      <p className="mb-4 text-sm text-[#958ea0]">Real quotes — AI didn&apos;t invent these.</p>
      <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10 bg-[#1c1b1d]/60">
        {quotes.map((quote, i) => (
          <QuoteCard key={i} quote={quote} />
        ))}
      </div>
    </section>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-wider text-[#ff8adf]" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      <span className="text-white/20">{'★'.repeat(Math.max(0, 5 - rating))}</span>
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
      <p className="text-sm leading-relaxed text-[#e5e1e4] italic">&ldquo;{quote.text}&rdquo;</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase text-[#958ea0]">
        {quote.category && (
          <div>
            <dt className="mb-0.5">Category</dt>
            <dd className="text-xs normal-case text-[#cbc3d7]">{quote.category}</dd>
          </div>
        )}
        {quote.competitor && (
          <div>
            <dt className="mb-0.5">Competitor</dt>
            <dd className="text-xs normal-case text-[#cbc3d7]">{quote.competitor}</dd>
          </div>
        )}
      </dl>
    </blockquote>
  )
}
