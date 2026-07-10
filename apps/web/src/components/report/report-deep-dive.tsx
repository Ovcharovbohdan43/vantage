'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ReportCompetitorCharts, ReportPainCharts, ReportScoreCharts } from '@/components/report-charts'
import type { ResearchReport } from '@/lib/api/types'
import type { ReportVerdict } from '@/lib/api/types'

const VERDICT_LABELS: Record<ReportVerdict, string> = {
  build: 'Build',
  pivot: 'Pivot',
  dont_build: "Don't build",
}

const VERDICT_STYLES: Record<ReportVerdict, string> = {
  build: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  pivot: 'text-amber-900 bg-amber-50 border-amber-200',
  dont_build: 'text-red-800 bg-red-50 border-red-200',
}

export function ReportDeepDive({ report, isPreview }: { report: ResearchReport; isPreview: boolean }) {
  const [open, setOpen] = useState(false)
  const { scores, recommendations } = report

  return (
    <section className="mb-8 border border-zinc-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">Full market analysis</p>
          <p className="text-sm text-zinc-600 mt-0.5">Scores, risk breakdown, methodology & summary</p>
        </div>
        <ChevronDown
          size={18}
          className={`text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-6 border-t border-zinc-100 space-y-6">
          <ReportScoreCharts marketScore={scores.market_score} riskScore={scores.risk_score} />

          {!isPreview && report.pain_clusters.length > 0 && (
            <ReportPainCharts clusters={report.pain_clusters} />
          )}

          {!isPreview && (
            <div className="border border-zinc-200 p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">Recommendation detail</p>
              <span
                className={`inline-flex text-sm font-semibold border px-2.5 py-1 mb-3 ${VERDICT_STYLES[recommendations.verdict]}`}
              >
                {VERDICT_LABELS[recommendations.verdict]}
              </span>
              <p className="text-sm text-zinc-600 leading-relaxed mb-4">{recommendations.reasoning}</p>
              {recommendations.next_steps.length > 0 && (
                <ul className="space-y-1.5 border-t border-zinc-100 pt-4">
                  {recommendations.next_steps.map((step) => (
                    <li key={step} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-zinc-400 shrink-0">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">Summary</p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{report.summary}</p>
          </div>

          {!isPreview && report.competitors.length > 0 && (
            <ReportCompetitorCharts competitors={report.competitors} />
          )}
        </div>
      )}
    </section>
  )
}
