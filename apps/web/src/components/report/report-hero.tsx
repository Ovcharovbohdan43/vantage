'use client'

import type { ResearchReport } from '@/lib/api/types'
import type { MarketSaturation, ReportVerdict } from '@/lib/api/types'

const SATURATION_LABEL: Record<MarketSaturation, string> = {
  HIGH: 'Saturated',
  MEDIUM: 'Moderate',
  LOW: 'Open',
}

const SATURATION_DOT: Record<MarketSaturation, string> = {
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🟢',
}

const VERDICT_LABEL: Record<ReportVerdict, string> = {
  build: 'Build',
  pivot: 'Pivot',
  dont_build: "Don't build",
}

type MetricTone = 'good' | 'caution' | 'bad' | 'neutral'

const TONE_GRADIENT: Record<MetricTone, string> = {
  good: 'bg-gradient-to-t from-emerald-100/70 via-emerald-50/25 to-white',
  caution: 'bg-gradient-to-t from-amber-100/70 via-amber-50/25 to-white',
  bad: 'bg-gradient-to-t from-red-100/70 via-red-50/25 to-white',
  neutral: 'bg-gradient-to-t from-zinc-100/60 via-zinc-50/20 to-white',
}

function competitionLevel(risk: number, saturation: MarketSaturation): 'High' | 'Medium' | 'Low' {
  if (saturation === 'HIGH' || risk >= 70) return 'High'
  if (saturation === 'MEDIUM' || risk >= 45) return 'Medium'
  return 'Low'
}

function saturationTone(saturation: MarketSaturation): MetricTone {
  if (saturation === 'HIGH') return 'bad'
  if (saturation === 'MEDIUM') return 'caution'
  return 'good'
}

function competitionTone(level: 'High' | 'Medium' | 'Low'): MetricTone {
  if (level === 'High') return 'bad'
  if (level === 'Medium') return 'caution'
  return 'good'
}

function verdictTone(verdict: ReportVerdict | 'locked'): MetricTone {
  if (verdict === 'build') return 'good'
  if (verdict === 'pivot') return 'caution'
  if (verdict === 'dont_build') return 'bad'
  return 'neutral'
}

function MetricCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  tone?: MetricTone
}) {
  return (
    <div className={`border border-zinc-200 p-3 sm:p-4 min-w-0 basis-[calc(50%-0.25rem)] sm:basis-[calc(33.333%-0.35rem)] md:min-w-[120px] md:flex-1 flex flex-col justify-between min-h-[80px] sm:min-h-[88px] ${TONE_GRADIENT[tone]}`}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">{label}</p>
      <div>
        <p className="text-base sm:text-lg font-semibold text-zinc-950 leading-tight">{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export function ReportTimeSavedBanner({ report }: { report: ResearchReport }) {
  const { stats } = report
  const duration = stats.analysis_duration_sec
  const durationLabel = duration
    ? `${Math.floor(duration / 60)} min ${duration % 60} sec`
    : 'under 3 min'

  return (
    <div className="border border-zinc-200 bg-zinc-50 px-5 py-4 mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
          Estimated time saved
        </p>
        <p className="text-2xl font-semibold tabular-nums text-zinc-950">
          ~{stats.time_saved_hours} hours
        </p>
      </div>
      <p className="text-sm text-zinc-600 max-w-md leading-relaxed">
        Instead of reading {stats.reviews_analyzed.toLocaleString()} reviews manually, Vantage
        extracted the key patterns in {durationLabel}.
      </p>
    </div>
  )
}

export function ReportExecutiveSummary({ report, isPreview }: { report: ResearchReport; isPreview: boolean }) {
  const { scores, stats, recommendations } = report
  const competition = competitionLevel(scores.risk_score, scores.market_saturation)
  const painTone: MetricTone = stats.pain_signals >= 80 ? 'good' : stats.pain_signals >= 30 ? 'caution' : 'bad'
  const coverageTone: MetricTone =
    stats.reviews_analyzed >= 150 ? 'good' : stats.reviews_analyzed >= 50 ? 'caution' : 'bad'
  const productsTone: MetricTone =
    stats.products_analyzed >= 10 ? 'good' : stats.products_analyzed >= 5 ? 'caution' : 'bad'

  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Executive summary</h2>
      <div className="flex flex-wrap gap-2">
        <MetricCard
          label="Market"
          value={`${SATURATION_DOT[scores.market_saturation]} ${SATURATION_LABEL[scores.market_saturation]}`}
          tone={saturationTone(scores.market_saturation)}
        />
        <MetricCard label="Competition" value={competition} tone={competitionTone(competition)} />
        <MetricCard
          label="Pain signals"
          value={stats.pain_signals.toLocaleString()}
          tone={painTone}
        />
        <MetricCard
          label="Reviews analyzed"
          value={stats.reviews_analyzed.toLocaleString()}
          tone={coverageTone}
        />
        <MetricCard
          label="Products analyzed"
          value={String(stats.products_analyzed)}
          tone={productsTone}
        />
        <MetricCard
          label="Recommendation"
          value={isPreview ? 'Locked' : VERDICT_LABEL[recommendations.verdict]}
          tone={verdictTone(isPreview ? 'locked' : recommendations.verdict)}
        />
      </div>
    </section>
  )
}

export function ReportVerdictHero({
  report,
  isPreview,
}: {
  report: ResearchReport
  isPreview: boolean
}) {
  const { recommendations, scores } = report
  const verdict = recommendations.verdict

  const VERDICT_ICON: Record<ReportVerdict, string> = {
    build: '✓',
    pivot: '⚠',
    dont_build: '✕',
  }

  const VERDICT_STYLE: Record<ReportVerdict, string> = {
    build: 'border-emerald-200 bg-emerald-50/80',
    pivot: 'border-amber-200 bg-amber-50/80',
    dont_build: 'border-red-200 bg-red-50/80',
  }

  const oneLiner =
    recommendations.reasoning.split(/[.!?]/)[0]?.trim() ||
    'Unlock the full report for a build / pivot / don\'t-build recommendation.'

  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Should I build it?</h2>
      <div className={`border p-6 md:p-8 ${isPreview ? 'border-zinc-200 bg-zinc-50' : VERDICT_STYLE[verdict]}`}>
        {isPreview ? (
          <p className="text-sm text-zinc-600">
            Verdict locked in preview. Unlock to see whether to build, pivot, or walk away — with
            confidence score and reasoning.
          </p>
        ) : (
          <div className="flex flex-wrap items-start gap-8">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Verdict</p>
              <p className="text-4xl font-semibold text-zinc-950 flex items-center gap-3">
                <span aria-hidden>{VERDICT_ICON[verdict]}</span>
                {VERDICT_LABEL[verdict]}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Confidence</p>
              <p className="text-4xl font-semibold tabular-nums text-zinc-950">{report.stats.confidence_pct}%</p>
            </div>
          </div>
        )}
        {!isPreview && (
          <p className="text-base text-zinc-800 leading-relaxed mt-6 max-w-2xl">
            {oneLiner}.
          </p>
        )}
        {!isPreview && scores.data_confidence === 'low' && (
          <p className="text-xs text-zinc-500 mt-3 font-mono">Low data confidence — validate with interviews.</p>
        )}
      </div>
    </section>
  )
}

export function ReportAnalysisTimeline({ report }: { report: ResearchReport }) {
  const { stats, recommendations } = report
  const steps = [
    { label: `${stats.reviews_analyzed.toLocaleString()} reviews`, active: true },
    { label: `${stats.clusters_found} pain clusters`, active: stats.clusters_found > 0 },
    { label: `${stats.major_problems} major problems`, active: stats.major_problems > 0 },
    { label: 'Risk analysis', active: true },
    { label: 'Final recommendation', active: report.access_level === 'full' },
  ]

  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Analysis pipeline</h2>
      <div className="border border-zinc-200 bg-white p-5">
        <div className="flex flex-col items-start gap-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-start">
              <span
                className={`text-xs font-mono px-3 py-2 border ${
                  step.active
                    ? 'border-zinc-950 bg-zinc-950 text-white'
                    : 'border-zinc-200 text-zinc-400'
                }`}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <span className="text-zinc-300 text-sm py-1 pl-4" aria-hidden>
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>
        {report.access_level === 'full' && recommendations.verdict && (
          <p className="text-xs text-zinc-500 mt-4 font-mono">
            Outcome: {VERDICT_LABEL[recommendations.verdict]}
          </p>
        )}
      </div>
    </section>
  )
}
