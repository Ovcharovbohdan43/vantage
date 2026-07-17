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
      <h2 className="mb-1 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
        Competitors ({competitors.length})
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-v-muted">
        These products were selected as direct rivals for the same job and buyer. If one looks
        adjacent (wrong audience or category), treat its complaints as weak evidence.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {competitors.map((competitor) => (
          <div
            key={competitor.id}
            className="rounded-xl border border-white/10 bg-v-surface/60 p-4 transition-colors hover:border-v-primary/25"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-v-on">{competitor.name}</h3>
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-v-muted transition-colors hover:text-v-primary"
                aria-label={`Open ${competitor.name}`}
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="font-landing-mono text-[10px] uppercase text-v-muted">Rating</dt>
                <dd className="font-medium tabular-nums text-v-on">
                  {competitor.rating != null ? `${competitor.rating.toFixed(1)} ★` : '—'}
                </dd>
              </div>
              <div>
                <dt className="font-landing-mono text-[10px] uppercase text-v-muted">Reviews</dt>
                <dd className="font-medium tabular-nums text-v-on">
                  {competitor.reviews_count?.toLocaleString() ?? '—'}
                </dd>
              </div>
              {!isPreview && competitor.negative_reviews_count != null && (
                <div className="col-span-2">
                  <dt className="font-landing-mono text-[10px] uppercase text-v-muted">Negative reviews</dt>
                  <dd className="font-medium tabular-nums text-v-error">
                    {competitor.negative_reviews_count.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
            {!isPreview && (competitor.top_complaints?.length ?? 0) > 0 && (
              <div className="border-t border-white/8 pt-3">
                <p className="mb-2 font-landing-mono text-[10px] uppercase text-v-muted">Top complaints</p>
                <ul className="space-y-1.5">
                  {competitor.top_complaints!.map((complaint, i) => (
                    <li key={i} className="line-clamp-2 text-xs leading-relaxed text-v-muted">
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
        <h2 className="font-landing-mono text-xs uppercase tracking-widest text-v-muted">Customer voice</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-v-primary underline underline-offset-2 transition-colors hover:text-v-on"
        >
          View all evidence
        </button>
      </div>
      <p className="mb-4 text-sm text-v-muted">Real quotes — AI didn&apos;t invent these.</p>
      <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10 bg-v-surface/60">
        {quotes.map((quote, i) => (
          <QuoteCard key={i} quote={quote} />
        ))}
      </div>
    </section>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-wider text-v-warn" aria-label={`${rating} out of 5 stars`}>
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
    review_date?: string | null
  }
}) {
  const dateLabel = quote.review_date
    ? new Date(quote.review_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <blockquote className="p-5">
      {quote.rating != null && (
        <div className="mb-3">
          <StarRow rating={quote.rating} />
        </div>
      )}
      <p className="text-sm leading-relaxed text-v-on italic">&ldquo;{quote.text}&rdquo;</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 font-landing-mono text-[10px] uppercase text-v-muted">
        {quote.competitor && (
          <div>
            <dt className="mb-0.5">Competitor</dt>
            <dd className="text-xs normal-case text-v-muted">{quote.competitor}</dd>
          </div>
        )}
        {quote.source && (
          <div>
            <dt className="mb-0.5">Source</dt>
            <dd className="text-xs normal-case text-v-muted">{quote.source.toUpperCase()}</dd>
          </div>
        )}
        {dateLabel && (
          <div>
            <dt className="mb-0.5">Review date</dt>
            <dd className="text-xs normal-case text-v-muted">{dateLabel}</dd>
          </div>
        )}
        {quote.category && (
          <div>
            <dt className="mb-0.5">Pain theme</dt>
            <dd className="text-xs normal-case text-v-muted">{quote.category}</dd>
          </div>
        )}
      </dl>
    </blockquote>
  )
}
