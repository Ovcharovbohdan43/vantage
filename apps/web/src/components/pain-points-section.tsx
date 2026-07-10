'use client'

import { Quotes } from '@phosphor-icons/react'
import type { ReportPainCluster } from '@/lib/api/types'

interface PainPointsSectionProps {
  clusters: ReportPainCluster[]
  isPreview: boolean
  onViewEvidence?: (clusterId: string) => void
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-600 text-xs font-mono" aria-label={`${rating} stars`}>
      {'★'.repeat(rating)}
      <span className="text-zinc-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  )
}

function sortByActionability(clusters: ReportPainCluster[]): ReportPainCluster[] {
  return [...clusters].sort((a, b) => {
    const scoreA = (a.commercial_opportunity ?? 0) * 2 + (a.severity_score ?? 0) + a.frequency * 0.1
    const scoreB = (b.commercial_opportunity ?? 0) * 2 + (b.severity_score ?? 0) + b.frequency * 0.1
    return scoreB - scoreA
  })
}

export function PainPointsSection({ clusters, isPreview, onViewEvidence }: PainPointsSectionProps) {
  const sorted = sortByActionability(clusters)

  if (clusters.length === 0) {
    return (
      <p className="text-sm text-zinc-500 border border-zinc-200 p-4">
        No pain clusters were identified. Re-run analysis after more reviews are collected, or add
        competitors manually.
      </p>
    )
  }

  if (isPreview) {
    return (
      <ul className="space-y-2 border border-zinc-200 p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">
          Top pain themes (titles only)
        </p>
        {sorted.map((cluster) => (
          <li key={cluster.id} className="flex items-center justify-between text-sm">
            <span className="text-zinc-800">{cluster.title}</span>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">{cluster.frequency} mentions</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((cluster, index) => (
        <article key={cluster.id} className="border border-zinc-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-xs font-mono text-zinc-400 pt-0.5 shrink-0">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-base font-semibold text-zinc-950 leading-snug">{cluster.title}</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase shrink-0">
              {cluster.frequency} mentions
              {cluster.severity_score != null ? ` · severity ${cluster.severity_score.toFixed(1)}` : ''}
              {cluster.commercial_opportunity != null
                ? ` · opportunity ${cluster.commercial_opportunity.toFixed(1)}`
                : ''}
            </span>
          </div>

          {cluster.description && (
            <p className="text-sm text-zinc-600 leading-relaxed mb-4">{cluster.description}</p>
          )}

          {cluster.solution_direction && (
            <div className="border border-emerald-200 bg-emerald-50/60 p-4 mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 mb-1">
                Killer feature wedge
              </p>
              <p className="text-sm text-zinc-900 leading-relaxed">{cluster.solution_direction}</p>
            </div>
          )}

          {cluster.quotes.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Quotes size={14} weight="duotone" />
                What users actually said
              </p>
              {cluster.quotes.map((quote, i) => (
                <blockquote key={i} className="border-l-2 border-zinc-300 pl-3">
                  {quote.rating != null && (
                    <div className="mb-1">
                      <StarRating rating={quote.rating} />
                    </div>
                  )}
                  <p className="text-sm text-zinc-800 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
                  {(quote.competitor || quote.source) && (
                    <p className="text-[10px] font-mono text-zinc-400 mt-1 uppercase">
                      {quote.competitor}
                      {quote.source ? ` · ${quote.source.toUpperCase()}` : ''}
                    </p>
                  )}
                </blockquote>
              ))}
            </div>
          )}

          {onViewEvidence && (
            <button
              type="button"
              onClick={() => onViewEvidence(cluster.id)}
              className="text-xs font-medium text-zinc-950 underline underline-offset-2 hover:text-zinc-600"
            >
              View all evidence for this pain
            </button>
          )}
        </article>
      ))}
    </div>
  )
}
