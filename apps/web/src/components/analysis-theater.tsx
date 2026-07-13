'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { getAnalysisLoadingCopy } from '@/lib/analysis-messages'
import type { Competitor, ResearchStage } from '@/lib/api/types'
import { STAGE_LABELS } from '@/lib/api/types'

const ROADMAP = [
  'finding_competitors',
  'collecting_reviews',
  'analyzing',
  'generating_report',
  'completed',
] as const

interface AnalysisTheaterProps {
  stage: ResearchStage
  competitors: Competitor[]
  competitorsLoading?: boolean
  startedAt?: string | null
  stats?: {
    reviewsCollected: number
    patternsFound: number
    competitorsChecked: number
    competitorsTotal: number
  }
  onCancel?: () => void
  cancelPending?: boolean
  cancelConfirm?: boolean
  onCancelConfirm?: () => void
  onCancelDismiss?: () => void
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function stageRank(stage: ResearchStage): number {
  if (stage === 'queued') return -0.5
  const idx = (ROADMAP as readonly ResearchStage[]).indexOf(stage)
  return idx === -1 ? 0 : idx
}

function logLines(stage: ResearchStage, stats: {
  reviewsCollected: number
  patternsFound: number
  competitorsChecked: number
  competitorsTotal: number
}): string[] {
  const lines: string[] = ['pipeline.start']
  if (stage === 'queued') {
    lines.push('queue.wait — waiting for worker')
    return lines
  }
  lines.push('competitors.scan — mapping market')
  if (stats.competitorsTotal > 0) {
    lines.push(`competitors.found — ${stats.competitorsTotal} products`)
  }
  if (stageRank(stage) >= 1) {
    lines.push(
      `reviews.collect — ${stats.reviewsCollected.toLocaleString()} negatives pulled`,
    )
  }
  if (stageRank(stage) >= 2) {
    lines.push(`clusters.build — ${stats.patternsFound} pain groups`)
  }
  if (stageRank(stage) >= 3) {
    lines.push('report.write — assembling evidence')
  }
  if (stage === 'completed') {
    lines.push('pipeline.done — report ready')
  } else {
    lines.push(`stage.active — ${STAGE_LABELS[stage] ?? stage}`)
  }
  return lines
}

export function AnalysisTheater({
  stage,
  competitors,
  competitorsLoading,
  startedAt,
  stats,
  onCancel,
  cancelPending,
  cancelConfirm,
  onCancelConfirm,
  onCancelDismiss,
}: AnalysisTheaterProps) {
  const copy = getAnalysisLoadingCopy(stage)
  const [elapsedSec, setElapsedSec] = useState(0)
  const currentRank = stageRank(stage)

  useEffect(() => {
    const origin = startedAt ? new Date(startedAt).getTime() : Date.now()
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - origin) / 1000)))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [startedAt])

  const liveStats = {
    reviewsCollected: stats?.reviewsCollected ?? 0,
    patternsFound: stats?.patternsFound ?? 0,
    competitorsChecked: stats?.competitorsChecked ?? competitors.length,
    competitorsTotal: Math.max(stats?.competitorsTotal ?? 0, competitors.length),
  }

  const events = useMemo(() => logLines(stage, liveStats), [stage, liveStats])

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-v-bg text-v-on">
      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="text-sm text-v-muted transition-colors hover:text-v-on">
          Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-landing-mono text-[10px] uppercase tracking-[0.14em] text-v-muted">
              Elapsed
            </p>
            <p className="font-landing-mono text-sm tabular-nums tracking-wide text-v-primary">
              {formatElapsed(elapsedSec)}
            </p>
          </div>
          {onCancel && (
            <div>
              {cancelConfirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hidden text-xs text-v-muted sm:inline">Stop this run?</span>
                  <button
                    type="button"
                    onClick={onCancelConfirm}
                    disabled={cancelPending}
                    className="rounded-md border border-v-error/40 px-3 py-1.5 text-xs font-medium text-v-error transition-colors hover:bg-v-error/10 disabled:opacity-50"
                  >
                    {cancelPending ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDismiss}
                    disabled={cancelPending}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-v-muted transition-colors hover:border-white/30 hover:text-v-on"
                  >
                    Keep going
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md border border-white/12 px-3 py-1.5 text-xs font-medium text-v-muted transition-colors hover:border-white/25 hover:text-v-on"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1120px] px-5 pt-4 md:px-8">
        <div className="rounded-lg border border-white/[0.08] bg-v-surface px-4 py-3 text-left sm:px-5">
          <p className="text-sm leading-relaxed text-v-muted">
            Collection usually takes about{' '}
            <span className="font-medium text-v-on">10 minutes</span>. We pull real negative reviews
            and cluster pain — not a skim.
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1120px] flex-1 grid-cols-1 gap-6 px-5 pb-8 pt-5 md:px-8 lg:grid-cols-[220px_minmax(0,1fr)_240px] lg:gap-8">
        <aside className="order-2 hidden min-h-0 flex-col lg:order-1 lg:flex">
          <p className="mb-3 font-landing-mono text-[10px] uppercase tracking-[0.14em] text-v-muted">
            Market map
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto border-y border-white/[0.06] py-1">
            {competitorsLoading && competitors.length === 0 ? (
              <ul className="space-y-3 py-3">
                {[1, 2, 3].map((row) => (
                  <li key={row} className="h-8 animate-pulse rounded bg-white/5" />
                ))}
              </ul>
            ) : competitors.length === 0 ? (
              <p className="py-4 text-sm leading-relaxed text-v-muted">
                Competitors will appear here as we find them.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {competitors.map((competitor) => (
                  <li key={competitor.id} className="min-w-0 py-3">
                    <p className="truncate text-sm font-medium text-v-on">{competitor.name}</p>
                    <p className="mt-1 font-landing-mono text-[11px] tracking-wide text-v-muted">
                      {competitor.rating != null ? (
                        <span className="text-v-primary">{competitor.rating.toFixed(1)}★</span>
                      ) : (
                        <span>—</span>
                      )}
                      <span className="mx-1.5 text-white/20">·</span>
                      {competitor.reviews_count != null
                        ? `${competitor.reviews_count.toLocaleString()} reviews`
                        : 'reviews pending'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="order-1 flex min-h-0 flex-col lg:order-2">
          <h1 className="text-xl font-semibold tracking-tight text-v-on sm:text-2xl">{copy.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-v-muted">
            {copy.tips[0]}
          </p>

          <div className="mt-6 flex-1 overflow-hidden rounded-lg border border-white/[0.08] bg-v-surface">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
                Event log
              </p>
              <p className="font-landing-mono text-[11px] text-v-primary">live</p>
            </div>
            <ul className="max-h-[280px] space-y-1.5 overflow-y-auto p-4 font-landing-mono text-[12px] leading-relaxed sm:max-h-[360px]">
              {events.map((line) => (
                <li key={line} className="text-v-muted">
                  <span className="text-v-primary/70">›</span> {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 lg:hidden">
            <TheaterRoadmap currentRank={currentRank} compact />
            <TheaterLiveCounters stats={liveStats} className="mt-6" />
          </div>
        </section>

        <aside className="order-3 hidden min-h-0 flex-col lg:flex">
          <p className="mb-3 font-landing-mono text-[10px] uppercase tracking-[0.14em] text-v-muted">
            Research path
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TheaterRoadmap currentRank={currentRank} />
          </div>
          <TheaterLiveCounters stats={liveStats} className="shrink-0 border-t border-white/[0.06] pt-5" />
        </aside>
      </div>
    </div>
  )
}

function TheaterLiveCounters({
  stats,
  className,
}: {
  stats: {
    reviewsCollected: number
    patternsFound: number
    competitorsChecked: number
    competitorsTotal: number
  }
  className?: string
}) {
  const competitorLabel =
    stats.competitorsTotal > 0
      ? `${stats.competitorsChecked}/${stats.competitorsTotal}`
      : String(stats.competitorsChecked)

  return (
    <div className={cn('space-y-3', className)}>
      <p className="font-landing-mono text-[10px] uppercase tracking-[0.14em] text-v-muted">
        Live counters
      </p>
      <ul className="space-y-2.5">
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-v-muted">Reviews</span>
          <span className="font-landing-mono text-lg tabular-nums tracking-tight text-v-on">
            {stats.reviewsCollected.toLocaleString()}
          </span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-v-muted">Patterns</span>
          <span className="font-landing-mono text-lg tabular-nums tracking-tight text-v-primary">
            {stats.patternsFound.toLocaleString()}
          </span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-v-muted">Competitors</span>
          <span className="font-landing-mono text-lg tabular-nums tracking-tight text-v-on">
            {competitorLabel}
          </span>
        </li>
      </ul>
    </div>
  )
}

function TheaterRoadmap({
  currentRank,
  compact = false,
}: {
  currentRank: number
  compact?: boolean
}) {
  return (
    <ol className={cn(compact ? 'space-y-2' : 'space-y-3')}>
      {ROADMAP.map((step, index) => {
        const done = currentRank > index
        const active = Math.floor(currentRank) === index || (currentRank < 0 && index === 0)
        const pending = currentRank < index

        return (
          <li key={step} className="relative flex gap-3">
            <span
              className={cn(
                'relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full',
                active && 'bg-v-primary',
                done && 'bg-v-tertiary',
                pending && 'bg-white/20',
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm',
                  active && 'font-medium text-v-on',
                  done && 'text-v-muted',
                  pending && 'text-v-muted/60',
                )}
              >
                {STAGE_LABELS[step]}
              </p>
              {active && (
                <p className="mt-0.5 font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                  Now
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
