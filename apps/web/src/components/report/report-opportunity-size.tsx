'use client'

import type { ResearchReport } from '@/lib/api/types'
import { cn } from '@/lib/utils'

function scoreTone(score: number): string {
  if (score >= 70) return 'text-v-tertiary'
  if (score >= 45) return 'text-v-primary'
  return 'text-v-error'
}

export function ReportOpportunitySize({
  report,
  isPreview,
}: {
  report: ResearchReport
  isPreview: boolean
}) {
  const size = report.recommendations.opportunity_size
  const funnel = [
    {
      label: 'Reviews analyzed',
      value: size?.reviews_analyzed ?? report.stats.reviews_analyzed,
    },
    {
      label: 'Negative signals',
      value: size?.negative_signals ?? report.stats.pain_signals,
    },
    {
      label: 'Pain clusters',
      value: size?.clusters_found ?? report.stats.clusters_found,
    },
    {
      label: 'Underserved problems',
      value: size?.underserved_problems ?? report.stats.major_problems,
    },
  ]

  const reasoning =
    report.recommendations.opportunity_reasoning ||
    report.recommendations.reasoning ||
    (isPreview
      ? 'Unlock the full report for opportunity reasoning grounded in complaint volume and competitor concentration.'
      : '')

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
        Opportunity size
      </h2>
      <div className="rounded-xl border border-white/10 bg-v-surface/80 p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-landing-mono text-[10px] uppercase tracking-widest text-v-muted">
              Opportunity score
            </p>
            <p className={cn('text-4xl font-semibold tabular-nums', scoreTone(report.scores.market_score))}>
              {Math.round(report.scores.market_score)}
              <span className="text-lg text-v-muted">/100</span>
            </p>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-v-muted">
            {isPreview ? reasoning : reasoning}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
          {funnel.map((step, index) => (
            <div key={step.label} className="flex flex-1 items-center gap-2">
              <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-v-surface-high/70 px-3 py-3">
                <p className="font-landing-mono text-[10px] uppercase tracking-widest text-v-muted">
                  {step.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-v-on">
                  {step.value.toLocaleString()}
                </p>
              </div>
              {index < funnel.length - 1 && (
                <span className="hidden px-1 text-v-primary/50 sm:inline" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
