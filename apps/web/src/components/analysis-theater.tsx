'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { EnergyAnimation } from '@/components/energy-animation'
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

const ROADMAP_BLURBS: Record<(typeof ROADMAP)[number], string> = {
  finding_competitors: 'Who already serves this market',
  collecting_reviews: 'What customers complain about',
  analyzing: 'Where the pain clusters form',
  generating_report: 'What you should do next',
  completed: 'Your research is ready',
}

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
  const [tipIndex, setTipIndex] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const currentRank = stageRank(stage)

  useEffect(() => {
    setTipIndex(0)
  }, [stage])

  useEffect(() => {
    if (copy.tips.length <= 1) return
    const timer = setInterval(() => {
      setTipIndex((current) => (current + 1) % copy.tips.length)
    }, 4800)
    return () => clearInterval(timer)
  }, [copy.tips.length, stage])

  useEffect(() => {
    const origin = startedAt ? new Date(startedAt).getTime() : Date.now()
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - origin) / 1000)))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [startedAt])

  const tip = copy.tips[tipIndex] ?? copy.tips[0]
  const liveStats = {
    reviewsCollected: stats?.reviewsCollected ?? 0,
    patternsFound: stats?.patternsFound ?? 0,
    competitorsChecked: stats?.competitorsChecked ?? competitors.length,
    competitorsTotal: Math.max(stats?.competitorsTotal ?? 0, competitors.length),
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a0c] text-[#e5e1e4]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4ec8]/10 blur-[120px]" />
        <div className="absolute right-[12%] bottom-[18%] h-64 w-64 rounded-full bg-[#d0bcff]/10 blur-[100px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/dashboard"
          className="text-sm text-white/45 transition-colors hover:text-white/80"
        >
          Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              Elapsed
            </p>
            <p className="font-mono text-sm tabular-nums tracking-wide text-[#ff8adf]">
              {formatElapsed(elapsedSec)}
            </p>
          </div>
          {onCancel && (
            <div>
              {cancelConfirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hidden text-xs text-white/50 sm:inline">Stop this run?</span>
                  <button
                    type="button"
                    onClick={onCancelConfirm}
                    disabled={cancelPending}
                    className="rounded-md border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {cancelPending ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDismiss}
                    disabled={cancelPending}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/30"
                  >
                    Keep going
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md border border-white/12 px-3 py-1.5 text-xs font-medium text-white/55 transition-colors hover:border-white/25 hover:text-white/80"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-5 md:px-8">
        <div className="rounded-xl border border-[#d0bcff]/20 bg-[#d0bcff]/8 px-4 py-3 text-left sm:px-5">
          <p className="text-sm leading-relaxed text-[#e5e1e4]/90">
            Data collection can take about{' '}
            <span className="font-medium text-[#d0bcff]">10 minutes</span>. We gather and process
            thousands of real customer reviews to find recurring pain patterns — not a quick skim.
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-1 gap-6 px-5 pb-8 pt-4 md:px-8 lg:grid-cols-[220px_minmax(0,1fr)_240px] lg:gap-8 lg:pb-10">
        {/* Competitors — no cards / no background */}
        <aside className="order-2 hidden min-h-0 flex-col lg:order-1 lg:flex">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
            Market map
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {competitorsLoading && competitors.length === 0 ? (
              <ul className="space-y-4">
                {[1, 2, 3].map((row) => (
                  <li key={row} className="h-8 animate-pulse rounded bg-white/5" />
                ))}
              </ul>
            ) : competitors.length === 0 ? (
              <p className="text-sm leading-relaxed text-white/35">
                Competitors will appear here as we find them.
              </p>
            ) : (
              <ul className="space-y-5">
                {competitors.map((competitor, index) => (
                  <motion.li
                    key={competitor.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    className="min-w-0"
                  >
                    <p className="truncate text-sm font-medium text-white/90">{competitor.name}</p>
                    <p className="mt-1 font-mono text-[11px] tracking-wide text-white/40">
                      {competitor.rating != null ? (
                        <span className="text-[#ff8adf]">{competitor.rating.toFixed(1)}★</span>
                      ) : (
                        <span>—</span>
                      )}
                      <span className="mx-1.5 text-white/20">·</span>
                      {competitor.reviews_count != null
                        ? `${competitor.reviews_count.toLocaleString()} reviews`
                        : 'reviews pending'}
                    </p>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Center animation + captions */}
        <section className="order-1 flex min-h-0 flex-col items-center justify-center text-center lg:order-2">
          <EnergyAnimation className="h-[240px] w-[240px] sm:h-[320px] sm:w-[320px] lg:h-[380px] lg:w-[380px]" />

          <div className="mt-2 max-w-md px-2 sm:mt-4">
            <h1 className="landing-energy-text text-xl font-semibold tracking-tight sm:text-2xl">
              {copy.title}
            </h1>
            <div className="mt-3 flex min-h-[3.25rem] items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${stage}-${tipIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  className="text-sm leading-relaxed text-white/50 sm:text-[15px]"
                >
                  {tip}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile competitors strip */}
          <div className="mt-8 w-full max-w-lg lg:hidden">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
              Market map
            </p>
            {competitors.length === 0 ? (
              <p className="text-left text-sm text-white/35">Finding competitors…</p>
            ) : (
              <ul className="space-y-3 text-left">
                {competitors.slice(0, 6).map((competitor) => (
                  <li key={competitor.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-white/85">{competitor.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-white/40">
                      {competitor.rating != null ? `${competitor.rating.toFixed(1)}★` : '—'}
                      {competitor.reviews_count != null
                        ? ` · ${competitor.reviews_count.toLocaleString()}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Mobile roadmap + counters */}
          <div className="mt-8 w-full max-w-lg lg:hidden">
            <TheaterRoadmap currentRank={currentRank} compact />
            <TheaterLiveCounters stats={liveStats} className="mt-6" />
          </div>
        </section>

        {/* Roadmap */}
        <aside className="order-3 hidden min-h-0 flex-col lg:flex">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
            Research path
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <TheaterRoadmap currentRank={currentRank} />
          </div>
          <TheaterLiveCounters stats={liveStats} className="shrink-0 border-t border-white/8 pt-6" />
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
    <div className={cn('space-y-4', className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
        Live signal
      </p>
      <ul className="space-y-3">
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-white/45">Reviews</span>
          <span className="landing-energy-text font-mono text-lg tabular-nums tracking-tight">
            {stats.reviewsCollected.toLocaleString()}
          </span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-white/45">Patterns</span>
          <span className="font-mono text-lg tabular-nums tracking-tight text-[#d0bcff]">
            {stats.patternsFound.toLocaleString()}
          </span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-white/45">Competitors</span>
          <span className="font-mono text-lg tabular-nums tracking-tight text-white/85">
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
    <ol className={cn('relative', compact ? 'space-y-3' : 'space-y-5')}>
      {!compact && (
        <div
          aria-hidden
          className="absolute top-2 bottom-2 left-[5px] w-px bg-gradient-to-b from-[#ff4ec8]/50 via-white/10 to-transparent"
        />
      )}
      {ROADMAP.map((step, index) => {
        const done = currentRank > index
        const active = Math.floor(currentRank) === index || (currentRank < 0 && index === 0)
        const pending = currentRank < index

        return (
          <li key={step} className="relative flex gap-3">
            <span
              className={cn(
                'relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                active && 'bg-[#ff5ec8] shadow-[0_0_12px_rgba(255,94,200,0.7)]',
                done && 'bg-[#d0bcff]',
                pending && 'bg-white/20',
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm',
                  active && 'font-medium text-white',
                  done && 'text-white/55',
                  pending && 'text-white/30',
                )}
              >
                {STAGE_LABELS[step]}
              </p>
              {!compact && (
                <p
                  className={cn(
                    'mt-0.5 text-xs leading-relaxed',
                    active ? 'text-white/45' : 'text-white/25',
                  )}
                >
                  {ROADMAP_BLURBS[step]}
                </p>
              )}
              {active && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#ff8adf]">
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
