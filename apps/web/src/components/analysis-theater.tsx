'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { getAnalysisLoadingCopy } from '@/lib/analysis-messages'
import { PolygonSpinner } from '@/components/ui/polygon-spinner'
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

type LogStatus = 'done' | 'active' | 'info'

type LogEvent = {
  id: string
  text: string
  status: LogStatus
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function stageRank(stage: ResearchStage): number {
  if (stage === 'queued') return -0.5
  const idx = (ROADMAP as readonly ResearchStage[]).indexOf(stage)
  return idx === -1 ? 0 : idx
}

function baseLogEvents(
  stage: ResearchStage,
  stats: {
    reviewsCollected: number
    patternsFound: number
    competitorsChecked: number
    competitorsTotal: number
  },
): LogEvent[] {
  const events: LogEvent[] = [
    { id: 'start', text: 'pipeline.start — job accepted', status: 'done' },
  ]

  if (stage === 'queued') {
    events.push({
      id: 'queue',
      text: 'queue.wait — waiting for an available worker',
      status: 'active',
    })
    return events
  }

  events.push({
    id: 'scan',
    text: 'competitors.scan — mapping the market',
    status: stageRank(stage) > 0 ? 'done' : 'active',
  })

  if (stats.competitorsTotal > 0) {
    events.push({
      id: 'found',
      text: `competitors.found — ${stats.competitorsTotal} products on the map`,
      status: 'done',
    })
  }

  if (stageRank(stage) >= 1) {
    events.push({
      id: 'reviews',
      text: `reviews.collect — ${stats.reviewsCollected.toLocaleString()} negatives pulled`,
      status: stageRank(stage) > 1 ? 'done' : 'active',
    })
  }

  if (stageRank(stage) >= 2) {
    events.push({
      id: 'clusters',
      text: `clusters.build — ${stats.patternsFound} pain groups`,
      status: stageRank(stage) > 2 ? 'done' : 'active',
    })
  }

  if (stageRank(stage) >= 3) {
    events.push({
      id: 'report',
      text: 'report.write — assembling evidence into the brief',
      status: stage === 'completed' ? 'done' : 'active',
    })
  }

  if (stage === 'completed') {
    events.push({
      id: 'done',
      text: 'pipeline.done — report ready · email queued',
      status: 'done',
    })
  } else {
    events.push({
      id: 'active-stage',
      text: `stage.active — ${STAGE_LABELS[stage] ?? stage}`,
      status: 'info',
    })
  }

  return events
}

const AMBIENT_BY_BUCKET: string[][] = [
  [
    'worker.heartbeat — collector process alive',
    'session.warm — browser profile ready',
  ],
  [
    'proxy.rotate — refreshing exit IP',
    'source.pace — respecting review-site rate limits',
    'captcha.pass — continuing collection',
  ],
  [
    'dedupe.hash — skipping repeat complaints',
    'sentiment.filter — keeping 1–2★ signal',
    'evidence.link — attaching source quotes',
  ],
  [
    'cluster.merge — collapsing near-duplicate pain',
    'rank.score — weighting by frequency × severity',
  ],
  [
    'brief.compose — writing the opportunity narrative',
    'notify.email — will send when the report is ready',
  ],
]

function ambientEvents(stage: ResearchStage, elapsedSec: number): LogEvent[] {
  if (stage === 'completed') return []
  const bucket =
    stage === 'queued'
      ? 0
      : stage === 'finding_competitors'
        ? 1
        : stage === 'collecting_reviews'
          ? 2
          : stage === 'analyzing'
            ? 3
            : 4
  const pool = AMBIENT_BY_BUCKET[bucket] ?? AMBIENT_BY_BUCKET[0]
  const count = Math.min(pool.length, Math.floor(elapsedSec / 8) + 1)
  return pool.slice(0, count).map((text, index) => ({
    id: `ambient-${bucket}-${index}`,
    text,
    status: 'info' as const,
  }))
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
  const [visibleCount, setVisibleCount] = useState(1)
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

  const liveStats = useMemo(
    () => ({
      reviewsCollected: stats?.reviewsCollected ?? 0,
      patternsFound: stats?.patternsFound ?? 0,
      competitorsChecked: stats?.competitorsChecked ?? competitors.length,
      competitorsTotal: Math.max(stats?.competitorsTotal ?? 0, competitors.length),
    }),
    [
      stats?.reviewsCollected,
      stats?.patternsFound,
      stats?.competitorsChecked,
      stats?.competitorsTotal,
      competitors.length,
    ],
  )

  const allEvents = useMemo(() => {
    const base = baseLogEvents(stage, liveStats)
    const ambient = ambientEvents(stage, elapsedSec)
    if (ambient.length === 0) return base
    const head = base.slice(0, Math.min(2, base.length))
    const tail = base.slice(head.length)
    return [...head, ...ambient, ...tail]
  }, [stage, elapsedSec, liveStats])

  useEffect(() => {
    setVisibleCount(1)
  }, [stage])

  useEffect(() => {
    if (visibleCount >= allEvents.length) return
    const timer = window.setTimeout(() => {
      setVisibleCount((n) => Math.min(n + 1, allEvents.length))
    }, 420)
    return () => window.clearTimeout(timer)
  }, [visibleCount, allEvents.length])

  const visibleEvents = allEvents.slice(0, visibleCount)

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
            <span className="font-medium text-v-on">10 minutes</span>. You don’t need to wait on
            this page —{' '}
            <Link href="/dashboard" className="font-medium text-v-on underline-offset-2 hover:underline">
              return to the dashboard
            </Link>{' '}
            anytime. When the analysis finishes, we’ll also email you the results.
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
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <PolygonSpinner size={40} className="text-v-muted" label="Loading competitors" />
                <p className="text-xs text-v-muted">Scanning market…</p>
              </div>
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
          <div className="flex items-start gap-4">
            {stage !== 'completed' && (
              <PolygonSpinner size={52} className="mt-0.5 shrink-0 text-v-primary" label="Analysis running" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-v-on sm:text-2xl">{copy.title}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-v-muted">{copy.tips[0]}</p>
            </div>
          </div>

          <div className="mt-6 flex-1 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1117]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#161b22] px-4 py-2">
              <div className="flex items-center gap-2">
                <PolygonSpinner size={16} className="text-v-primary" label="" />
                <p className="font-landing-mono text-[11px] uppercase tracking-[0.14em] text-[#8b949e]">
                  Event log
                </p>
              </div>
              <p className="flex items-center gap-1.5 font-landing-mono text-[11px] text-[#3fb950]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fb950] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3fb950]" />
                </span>
                live
              </p>
            </div>
            <ul className="max-h-[280px] space-y-0 overflow-y-auto p-3 font-landing-mono text-[12px] leading-relaxed sm:max-h-[360px]">
              {visibleEvents.map((event, index) => (
                <li
                  key={event.id}
                  className={cn(
                    'flex gap-2 rounded-md px-2 py-1.5 transition-colors',
                    event.status === 'active' && 'bg-[#238636]/15',
                    event.status === 'info' && 'text-[#8b949e]',
                  )}
                  style={{
                    animation: 'vantage-log-in 280ms ease-out both',
                    animationDelay: `${Math.min(index, 6) * 30}ms`,
                  }}
                >
                  <span className="shrink-0 tabular-nums text-[#484f58]">
                    {formatClock(Math.max(0, elapsedSec - (visibleEvents.length - 1 - index) * 3))}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 w-3 text-center',
                      event.status === 'done' && 'text-[#3fb950]',
                      event.status === 'active' && 'text-v-primary',
                      event.status === 'info' && 'text-[#484f58]',
                    )}
                    aria-hidden
                  >
                    {event.status === 'done' ? '✓' : event.status === 'active' ? '●' : '·'}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 break-words',
                      event.status === 'done' && 'text-[#c9d1d9]',
                      event.status === 'active' && 'text-[#e6edf3]',
                      event.status === 'info' && 'text-[#8b949e]',
                    )}
                  >
                    {event.text}
                    {event.status === 'active' && (
                      <span className="ml-1 inline-block animate-pulse text-v-primary">▌</span>
                    )}
                  </span>
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
