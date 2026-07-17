'use client'

import type { ResearchReport } from '@/lib/api/types'
import type { MarketSaturation } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const SATURATION_LABEL: Record<MarketSaturation, string> = {
  HIGH: 'Saturated',
  MEDIUM: 'Moderate',
  LOW: 'Open',
}

type MetricTone = 'good' | 'caution' | 'bad' | 'neutral'

const TONE_SURFACE: Record<MetricTone, string> = {
  good: 'border-emerald-400/25 bg-gradient-to-b from-emerald-400/12 to-v-surface',
  caution: 'border-v-primary/30 bg-gradient-to-b from-v-primary/14 to-v-surface',
  bad: 'border-v-error/30 bg-gradient-to-b from-v-error/14 to-v-surface',
  neutral: 'border-white/10 bg-gradient-to-b from-white/[0.06] to-v-surface',
}

const TONE_DOT: Record<MetricTone, string> = {
  good: 'bg-emerald-400',
  caution: 'bg-v-primary',
  bad: 'bg-v-error',
  neutral: 'bg-v-muted',
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

function MetricCard({
  label,
  value,
  sub,
  hint,
  tone = 'neutral',
  showDot,
}: {
  label: string
  value: string
  sub?: string
  hint?: string
  tone?: MetricTone
  showDot?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-h-[80px] min-w-0 basis-[calc(50%-0.25rem)] flex-col justify-between rounded-xl border p-3 sm:min-h-[88px] sm:basis-[calc(33.333%-0.35rem)] sm:p-4 md:min-w-[120px] md:flex-1',
        TONE_SURFACE[tone],
      )}
      title={hint}
    >
      <p className="mb-2 font-landing-mono text-[10px] uppercase tracking-widest text-v-muted">{label}</p>
      <div>
        <p className="flex items-center gap-2 text-base leading-tight font-semibold text-v-on sm:text-lg">
          {showDot && (
            <span className={cn('size-2 shrink-0 rounded-full', TONE_DOT[tone])} aria-hidden />
          )}
          {value}
        </p>
        {sub && <p className="mt-1 text-xs leading-snug text-v-muted">{sub}</p>}
      </div>
    </div>
  )
}

const MARKET_HINT: Record<MarketSaturation, string> = {
  LOW: 'Open = few dominant tools for this problem. Room to enter if pain is real.',
  MEDIUM: 'Moderate = some competition. Differentiate on a sharp pain, not a broad feature set.',
  HIGH: 'Saturated = crowded category. Prefer a narrow wedge or pivot unless pain is severe.',
}

const COMPETITION_HINT = {
  Low: 'Few direct rivals in the sample — validate demand before building broadly.',
  Medium: 'Several rivals — win by solving one painful gap better than they do.',
  High: 'Crowded field — only pursue if you have a clear, evidence-backed wedge.',
} as const

export function ReportTimeSavedBanner({ report }: { report: ResearchReport }) {
  const { stats } = report
  const duration = stats.analysis_duration_sec
  const durationLabel = duration
    ? `${Math.floor(duration / 60)} min ${duration % 60} sec`
    : 'under 3 min'

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-v-primary/25 bg-v-surface-high/80 px-5 py-4">
      <div>
        <p className="mb-1 font-landing-mono text-[10px] uppercase tracking-widest text-v-muted">
          Estimated time saved
        </p>
        <p className="text-2xl font-semibold tabular-nums text-v-primary">
          ~{stats.time_saved_hours} hours
        </p>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-v-muted">
        Instead of reading {stats.reviews_analyzed.toLocaleString()} reviews manually, Vantage
        extracted the key patterns in {durationLabel}.
      </p>
    </div>
  )
}

export function ReportExecutiveSummary({
  report,
  isPreview,
}: {
  report: ResearchReport
  isPreview: boolean
}) {
  const { scores, stats } = report
  const competition = competitionLevel(scores.risk_score, scores.market_saturation)
  const painTone: MetricTone =
    stats.pain_signals >= 80 ? 'good' : stats.pain_signals >= 30 ? 'caution' : 'bad'
  const coverageTone: MetricTone =
    stats.reviews_analyzed >= 150 ? 'good' : stats.reviews_analyzed >= 50 ? 'caution' : 'bad'
  const productsTone: MetricTone =
    stats.products_analyzed >= 10 ? 'good' : stats.products_analyzed >= 5 ? 'caution' : 'bad'
  const opportunityTone: MetricTone =
    scores.market_score >= 70 ? 'good' : scores.market_score >= 45 ? 'caution' : 'bad'

  const opportunitySub = isPreview
    ? 'Unlock with credits for a scored verdict'
    : scores.market_score >= 70
      ? 'Strong — worth deeper exploration'
      : scores.market_score >= 45
        ? 'Mixed — dig into pain themes before deciding'
        : 'Weak — lean don’t-build unless a niche wedge is clear'

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-landing-mono text-xs uppercase tracking-widest text-v-muted">
          Market snapshot
        </h2>
        <p className="max-w-xl text-xs leading-relaxed text-v-muted">
          Green = favorable for builders · amber = dig deeper · red = caution. Hover a card for
          guidance.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <MetricCard
          label="Market"
          value={SATURATION_LABEL[scores.market_saturation]}
          sub={
            scores.market_saturation === 'LOW'
              ? 'Few incumbents for this problem'
              : scores.market_saturation === 'MEDIUM'
                ? 'Some competition — need a wedge'
                : 'Crowded — narrow wedge required'
          }
          hint={MARKET_HINT[scores.market_saturation]}
          tone={saturationTone(scores.market_saturation)}
          showDot
        />
        <MetricCard
          label="Competition"
          value={competition}
          sub={COMPETITION_HINT[competition]}
          hint={COMPETITION_HINT[competition]}
          tone={competitionTone(competition)}
        />
        <MetricCard
          label="Pain signals"
          value={stats.pain_signals.toLocaleString()}
          sub={
            stats.pain_signals >= 80
              ? 'Strong complaint volume — good for builders'
              : stats.pain_signals >= 30
                ? 'Moderate signal — check themes below'
                : 'Thin signal — evidence may be weak'
          }
          hint="Count of negative review mentions grouped into pain themes. Higher usually means clearer customer problems to solve."
          tone={painTone}
        />
        <MetricCard
          label="Reviews analyzed"
          value={stats.reviews_analyzed.toLocaleString()}
          sub={
            stats.reviews_analyzed >= 150
              ? 'Solid sample size'
              : stats.reviews_analyzed >= 50
                ? 'OK sample — treat outliers carefully'
                : 'Small sample — low confidence'
          }
          hint="How many G2/Capterra reviews we actually read. More reviews = more trustworthy patterns."
          tone={coverageTone}
        />
        <MetricCard
          label="Products analyzed"
          value={String(stats.products_analyzed)}
          sub={
            stats.products_analyzed >= 10
              ? 'Broad competitor sample'
              : stats.products_analyzed >= 5
                ? 'Decent competitor sample'
                : 'Narrow sample — check relevance'
          }
          hint="Number of competitor products whose reviews we scanned. Verify they match your audience."
          tone={productsTone}
        />
        <MetricCard
          label="Opportunity"
          value={isPreview ? 'Locked' : `${Math.round(scores.market_score)}/100`}
          sub={opportunitySub}
          hint={
            isPreview
              ? 'This free preview shows market openness only. Opportunity /100 is part of the full report and uses credits — it is not a second free idea.'
              : '0–100 score from saturation, pain severity, and review coverage. 70+ = explore; under 45 = lean abandon unless you have a sharp niche.'
          }
          tone={isPreview ? 'neutral' : opportunityTone}
        />
      </div>
      {isPreview && (
        <p className="mt-3 rounded-lg border border-white/[0.08] bg-v-surface/80 px-3 py-2.5 text-xs leading-relaxed text-v-muted">
          <span className="font-medium text-v-on">How to read this teaser:</span> “Market — Open”
          means low saturation in the sample. “Opportunity — Locked” means the scored verdict,
          quotes, and raw evidence need a full report (uses your starter credits). The free preview
          is intentionally a market teaser, not a complete go / no-go.
        </p>
      )}
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
  // Kept for import compatibility — opportunity block replaced the BUILD hero.
  void report
  void isPreview
  return null
}

export function ReportAnalysisTimeline({ report }: { report: ResearchReport }) {
  const { stats } = report
  const steps = [
    { label: `${stats.reviews_analyzed.toLocaleString()} reviews`, active: true },
    { label: `${stats.clusters_found} pain clusters`, active: stats.clusters_found > 0 },
    { label: `${stats.major_problems} major problems`, active: stats.major_problems > 0 },
    { label: 'Complaint analytics', active: true },
    { label: 'Opportunity score', active: report.access_level === 'full' },
  ]

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
        Analysis pipeline
      </h2>
      <div className="rounded-xl border border-white/10 bg-v-surface/60 p-5">
        <div className="flex flex-col items-start gap-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-start">
              <span
                className={cn(
                  'rounded-lg border px-3 py-2 font-landing-mono text-xs',
                  step.active
                    ? 'border-v-primary/40 bg-v-primary/15 text-v-primary'
                    : 'border-white/10 text-v-muted',
                )}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <span className="py-1 pl-4 text-sm text-v-primary/40" aria-hidden>
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
