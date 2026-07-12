'use client'

import { useState } from 'react'
import type { ReportPainCluster, ResearchReport } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const TREND_LABEL = {
  growing: 'Growing complaints',
  flat: 'Stable',
  declining: 'Easing',
} as const

function OpportunityCard({
  cluster,
  rank,
  isPreview,
  onReadEvidence,
}: {
  cluster: ReportPainCluster
  rank: number
  isPreview: boolean
  onReadEvidence?: (clusterId: string) => void
}) {
  const [showAllQuotes, setShowAllQuotes] = useState(false)
  const mentionCount = cluster.mention_count ?? cluster.frequency
  const share = cluster.share_pct ?? cluster.negative_share_pct
  const quotes = cluster.quotes ?? []
  const visibleQuotes = showAllQuotes ? quotes : quotes.slice(0, 5)
  const subThemes = cluster.sub_themes ?? []
  const competitors = cluster.competitors ?? []
  const terms = cluster.top_terms ?? []
  const requests = cluster.feature_requests ?? []

  return (
    <article className="rounded-xl border border-white/10 bg-[#1c1b1d]/70 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
            #{rank} · {mentionCount.toLocaleString()} mentions
            {share != null ? ` · ${share}%` : ''}
            {cluster.severity_score != null ? ` · severity ${cluster.severity_score.toFixed(1)}/10` : ''}
          </p>
          <h3 className="text-lg font-semibold leading-snug text-[#e5e1e4] md:text-xl">
            {cluster.title}
          </h3>
          {cluster.trend && (
            <p className="mt-2 font-mono text-xs text-[#d0bcff]">{TREND_LABEL[cluster.trend]}</p>
          )}
        </div>
      </div>

      {!isPreview && cluster.why_opportunity && (
        <p className="mb-5 text-sm leading-relaxed text-[#cbc3d7]">{cluster.why_opportunity}</p>
      )}

      {!isPreview && subThemes.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
            What specifically irritates them
          </p>
          <ul className="space-y-1.5">
            {subThemes.map((theme) => (
              <li key={`${theme.title}-${theme.frequency}`} className="flex gap-2 text-sm text-[#e5e1e4]">
                <span className="shrink-0 text-[#d0bcff]">✔</span>
                <span>
                  <span className="tabular-nums text-[#d0bcff]">{theme.frequency}</span>
                  {' — '}
                  {theme.title}
                  {theme.share_pct != null ? (
                    <span className="text-[#958ea0]"> ({theme.share_pct}%)</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isPreview && competitors.length > 0 && (
        <div className="mb-5 overflow-x-auto">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
            Who gets these complaints
          </p>
          <table className="w-full min-w-[240px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[#958ea0]">
                <th className="py-1.5 font-mono text-[10px] font-normal uppercase tracking-widest">
                  Competitor
                </th>
                <th className="py-1.5 font-mono text-[10px] font-normal uppercase tracking-widest">
                  Complaints
                </th>
              </tr>
            </thead>
            <tbody>
              {competitors.slice(0, 8).map((row) => (
                <tr key={row.name} className="border-b border-white/5">
                  <td className="py-1.5 text-[#e5e1e4]">{row.name}</td>
                  <td className="py-1.5 tabular-nums text-[#cbc3d7]">{row.complaints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isPreview && terms.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
            Words customers repeat
          </p>
          <div className="flex flex-wrap gap-2">
            {terms.slice(0, 12).map((term) => (
              <span
                key={term.term}
                className="rounded border border-white/10 bg-[#201f22] px-2 py-1 font-mono text-xs text-[#cbc3d7]"
              >
                {term.term}
                <span className="ml-1 text-[#958ea0]">×{term.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {!isPreview && requests.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
            What users asked for instead
          </p>
          <ul className="space-y-1.5">
            {requests.map((req) => (
              <li key={req.label} className="text-sm text-[#e5e1e4]">
                <span className="tabular-nums text-[#d0bcff]">{req.count}</span>
                {' — '}
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isPreview && quotes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
              Customer quotes ({quotes.length})
            </p>
            {onReadEvidence && (
              <button
                type="button"
                onClick={() => onReadEvidence(cluster.id)}
                className="font-mono text-[10px] uppercase tracking-widest text-[#d0bcff] hover:underline"
              >
                Open evidence
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {visibleQuotes.map((quote, index) => (
              <li
                key={`${cluster.id}-q-${index}`}
                className="border-l-2 border-[#d0bcff]/40 pl-3 text-sm leading-relaxed text-[#cbc3d7]"
              >
                “{quote.text}”
                <span className="mt-1 block font-mono text-[10px] text-[#958ea0]">
                  {[quote.competitor, quote.rating != null ? `${quote.rating}/5` : null, quote.source]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          {quotes.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllQuotes((v) => !v)}
              className={cn(
                'mt-3 font-mono text-[10px] uppercase tracking-widest text-[#d0bcff] hover:underline',
              )}
            >
              {showAllQuotes ? 'Show fewer quotes' : `Show all ${quotes.length} quotes`}
            </button>
          )}
        </div>
      )}

      {isPreview && (
        <p className="text-sm text-[#958ea0]">
          Unlock to see sub-themes, competitor split, repeated words, feature asks, and quotes.
        </p>
      )}
    </article>
  )
}

export function ReportBiggestOpportunities({
  report,
  isPreview,
  onReadEvidence,
}: {
  report: ResearchReport
  isPreview: boolean
  onReadEvidence?: (clusterId: string) => void
}) {
  const clusters = report.pain_clusters

  if (clusters.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
          Biggest opportunities
        </h2>
        <p className="text-sm text-[#958ea0]">No recurring pain patterns were identified.</p>
      </section>
    )
  }

  return (
    <section className="mb-8">
      <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
        Biggest opportunities
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-[#958ea0]">
        Ranked by how often unhappy customers raised each issue — not by AI opinion.
      </p>
      <div className="space-y-5">
        {clusters.map((cluster, index) => (
          <OpportunityCard
            key={cluster.id}
            cluster={cluster}
            rank={index + 1}
            isPreview={isPreview}
            onReadEvidence={onReadEvidence}
          />
        ))}
      </div>
    </section>
  )
}

export function ReportYearTrends({ report, isPreview }: { report: ResearchReport; isPreview: boolean }) {
  if (isPreview) return null

  const clustersWithTrend = report.pain_clusters.filter(
    (c) => (c.year_counts?.length ?? 0) >= 2 && (c.date_coverage ?? 0) >= 0.4,
  )
  if (clustersWithTrend.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
        How complaints changed over time
      </h2>
      <div className="space-y-4">
        {clustersWithTrend.slice(0, 4).map((cluster) => (
          <div key={cluster.id} className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4">
            <p className="mb-3 text-sm font-medium text-[#e5e1e4]">{cluster.title}</p>
            <div className="flex flex-wrap gap-3">
              {(cluster.year_counts ?? []).map((row) => (
                <div
                  key={`${cluster.id}-${row.year}`}
                  className="min-w-[72px] rounded-lg border border-white/8 bg-[#201f22] px-3 py-2 text-center"
                >
                  <p className="font-mono text-[10px] text-[#958ea0]">{row.year}</p>
                  <p className="text-lg font-semibold tabular-nums text-[#d0bcff]">{row.count}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ReportAiSummary({ report, isPreview }: { report: ResearchReport; isPreview: boolean }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
        Short AI summary
      </h2>
      <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-5">
        <p className="text-sm leading-relaxed whitespace-pre-line text-[#cbc3d7]">
          {isPreview
            ? 'Unlock the full report to read the grounded summary of what customers actually said.'
            : report.summary}
        </p>
      </div>
    </section>
  )
}
