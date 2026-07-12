'use client'

import type { ResearchReport } from '@/lib/api/types'
import { cn } from '@/lib/utils'

function scoreTone(score: number): string {
  if (score >= 70) return 'text-emerald-300'
  if (score >= 45) return 'text-[#d0bcff]'
  return 'text-[#ff8adf]'
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
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
        Opportunity size
      </h2>
      <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
              Opportunity score
            </p>
            <p className={cn('text-4xl font-semibold tabular-nums', scoreTone(report.scores.market_score))}>
              {Math.round(report.scores.market_score)}
              <span className="text-lg text-[#958ea0]">/100</span>
            </p>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-[#cbc3d7]">
            {isPreview ? reasoning : reasoning}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
          {funnel.map((step, index) => (
            <div key={step.label} className="flex flex-1 items-center gap-2">
              <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#201f22]/70 px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
                  {step.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#e5e1e4]">
                  {step.value.toLocaleString()}
                </p>
              </div>
              {index < funnel.length - 1 && (
                <span className="hidden px-1 text-[#d0bcff]/50 sm:inline" aria-hidden>
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
