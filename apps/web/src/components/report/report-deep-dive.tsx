'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ReportCompetitorCharts, ReportPainCharts, ReportScoreCharts } from '@/components/report-charts'
import type { ResearchReport } from '@/lib/api/types'
import type { ReportVerdict } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const VERDICT_LABELS: Record<ReportVerdict, string> = {
  build: 'Build',
  pivot: 'Pivot',
  dont_build: "Don't build",
}

const VERDICT_STYLES: Record<ReportVerdict, string> = {
  build: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300',
  pivot: 'border-[#d0bcff]/40 bg-[#d0bcff]/12 text-[#d0bcff]',
  dont_build: 'border-[#ff4ec8]/40 bg-[#ff4ec8]/12 text-[#ff8adf]',
}

export function ReportDeepDive({ report, isPreview }: { report: ResearchReport; isPreview: boolean }) {
  const [open, setOpen] = useState(false)
  const { scores, recommendations } = report

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-white/10 bg-[#1c1b1d]/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#d0bcff]/5"
      >
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">
            Full market analysis
          </p>
          <p className="mt-0.5 text-sm text-[#cbc3d7]">
            Scores, risk breakdown, methodology & summary
          </p>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-[#958ea0] transition-transform',
            open && 'rotate-180 text-[#d0bcff]',
          )}
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-white/8 px-5 pb-6">
          <ReportScoreCharts marketScore={scores.market_score} riskScore={scores.risk_score} />

          {!isPreview && report.pain_clusters.length > 0 && (
            <ReportPainCharts clusters={report.pain_clusters} />
          )}

          {!isPreview && (
            <div className="rounded-xl border border-white/10 bg-[#201f22]/60 p-5">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
                Recommendation detail
              </p>
              <span
                className={cn(
                  'mb-3 inline-flex rounded border px-2.5 py-1 text-sm font-semibold',
                  VERDICT_STYLES[recommendations.verdict],
                )}
              >
                {VERDICT_LABELS[recommendations.verdict]}
              </span>
              <p className="mb-4 text-sm leading-relaxed text-[#cbc3d7]">
                {recommendations.reasoning}
              </p>
              {recommendations.next_steps.length > 0 && (
                <ul className="space-y-1.5 border-t border-white/8 pt-4">
                  {recommendations.next_steps.map((step) => (
                    <li key={step} className="flex gap-2 text-sm text-[#e5e1e4]">
                      <span className="shrink-0 text-[#d0bcff]">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#958ea0]">Summary</p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-[#cbc3d7]">
              {report.summary}
            </p>
          </div>

          {!isPreview && report.competitors.length > 0 && (
            <ReportCompetitorCharts competitors={report.competitors} />
          )}
        </div>
      )}
    </section>
  )
}
