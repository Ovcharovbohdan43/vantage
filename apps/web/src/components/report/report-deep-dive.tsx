'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ReportCompetitorCharts, ReportPainCharts, ReportScoreCharts } from '@/components/report-charts'
import type { ResearchReport } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export function ReportDeepDive({ report, isPreview }: { report: ResearchReport; isPreview: boolean }) {
  const [open, setOpen] = useState(false)
  const { scores, recommendations } = report
  const reasoning =
    recommendations.opportunity_reasoning || recommendations.reasoning || ''

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-white/10 bg-v-surface/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-v-primary/5"
      >
        <div>
          <p className="font-landing-mono text-xs uppercase tracking-widest text-v-muted">
            Charts & methodology
          </p>
          <p className="mt-0.5 text-sm text-v-muted">Score charts and competitor landscape</p>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-v-muted transition-transform',
            open && 'rotate-180 text-v-primary',
          )}
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-white/8 px-5 pb-6">
          <ReportScoreCharts marketScore={scores.market_score} riskScore={scores.risk_score} />

          {!isPreview && report.pain_clusters.length > 0 && (
            <ReportPainCharts clusters={report.pain_clusters} />
          )}

          {!isPreview && reasoning && (
            <div className="rounded-xl border border-white/10 bg-v-surface-high/60 p-5">
              <p className="mb-2 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
                Opportunity reasoning
              </p>
              <p className="text-sm leading-relaxed text-v-muted">{reasoning}</p>
            </div>
          )}

          {!isPreview && report.competitors.length > 0 && (
            <ReportCompetitorCharts competitors={report.competitors} />
          )}
        </div>
      )}
    </section>
  )
}
