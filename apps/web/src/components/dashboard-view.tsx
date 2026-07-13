'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listProjects } from '@/lib/api/projects'
import { getCredits } from '@/lib/api/billing'
import { STAGE_LABELS, type Project } from '@/lib/api/types'
import { DashboardSkeleton } from '@/components/ui/skeleton-card'
import { CreditsMeter } from '@/components/credits-meter'
import { PricingModal } from '@/components/pricing-modal'
import { StateScreen } from '@/components/state-screen'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'running' | 'completed' | 'failed'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function matchesFilter(project: Project, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'running') return project.status === 'running' || project.status === 'queued'
  return project.status === filter
}

function StatusDot({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'bg-v-tertiary'
      : status === 'failed'
        ? 'bg-v-error'
        : status === 'running' || status === 'queued'
          ? 'bg-v-primary'
          : 'bg-v-muted'

  return <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', tone)} aria-hidden />
}

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
]

export function DashboardView() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [pricingOpen, setPricingOpen] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.items.some(
        (p) => p.status === 'running' || p.status === 'queued',
      )
      return hasRunning ? 3000 : false
    },
  })

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
  })

  const projects = data?.items ?? []

  const counts = useMemo(
    () => ({
      all: projects.length,
      running: projects.filter((p) => p.status === 'running' || p.status === 'queued').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      failed: projects.filter((p) => p.status === 'failed').length,
    }),
    [projects],
  )

  const filtered = useMemo(() => projects.filter((p) => matchesFilter(p, filter)), [projects, filter])

  const running = filtered.filter((p) => p.status === 'running' || p.status === 'queued')
  const history = filtered.filter(
    (p) => p.status === 'completed' || p.status === 'failed' || p.status === 'cancelled',
  )

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        <StateScreen
          figure="offline"
          title="Workspace temporarily unavailable"
          description="We couldn’t load your research right now. This usually clears in a moment — try again, or start a new analysis when you’re ready."
          primaryAction={{
            label: isFetching ? 'Trying…' : 'Try again',
            onClick: () => {
              void refetch()
            },
          }}
          secondaryAction={{ label: 'New research', href: '/research/new' }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-v-on">Research workspace</h1>
          <p className="mt-0.5 text-sm text-v-muted">
            {projects.length === 0
              ? 'No analyses yet'
              : `${projects.length} ${projects.length === 1 ? 'analysis' : 'analyses'}`}
          </p>
        </div>
        <Link
          href="/research/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
        >
          New research
        </Link>
      </div>

      {credits && (
        <CreditsMeter
          credits={credits}
          className="mb-8"
          onBuyCredits={() => setPricingOpen(true)}
        />
      )}

      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="Buy research credits"
        highlightPack="founder"
      />

      {projects.length > 0 && (
        <div
          className="mb-6 flex flex-wrap gap-1 border-b border-white/[0.06] pb-px"
          role="tablist"
          aria-label="Filter analyses"
        >
          {FILTER_OPTIONS.map((option) => {
            const selected = filter === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(option.id)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
                  selected
                    ? 'border-v-primary text-v-on'
                    : 'border-transparent text-v-muted hover:text-v-on',
                )}
              >
                {option.label}
                <span className="ml-1.5 font-landing-mono text-[11px] tabular-nums text-v-muted">
                  {counts[option.id]}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {projects.length === 0 ? (
        <StateScreen
          figure="empty"
          title="Start your first market analysis"
          description="Describe your product idea — we analyze competitor reviews from G2 and Capterra to surface real user pain points."
          primaryAction={{ label: 'New research', href: '/research/new' }}
          className="border border-dashed border-white/12 py-12 sm:py-14"
        />
      ) : filtered.length === 0 ? (
        <StateScreen
          figure="filter"
          title="Nothing in this view"
          description="No analyses match this filter. Try another status, or show everything in your workspace."
          primaryAction={{
            label: 'Show all',
            onClick: () => setFilter('all'),
          }}
          className="border border-white/[0.08] py-10 sm:py-12"
        />
      ) : (
        <div className="space-y-10">
          {running.length > 0 && (
            <section>
              <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
                Running
              </h2>
              <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {running.map((p) => (
                  <Link
                    key={p.id}
                    href={`/research/${p.id}`}
                    className="flex flex-col gap-2 px-1 py-3.5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <StatusDot status={p.status} />
                      <span className="truncate text-sm font-medium text-v-on">{p.title}</span>
                      <span className="hidden shrink-0 text-xs text-v-muted sm:inline">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pl-4 sm:pl-0">
                      <div className="h-1 min-w-[100px] max-w-[160px] flex-1 overflow-hidden rounded-full bg-white/10 sm:flex-none">
                        <div
                          className="h-1 rounded-full bg-v-primary transition-all"
                          style={{ width: `${p.latest_job?.progress_pct ?? 0}%` }}
                        />
                      </div>
                      <span className="font-landing-mono text-[11px] tabular-nums text-v-muted">
                        {p.latest_job?.progress_pct ?? 0}%
                      </span>
                      <span className="text-xs text-v-muted">
                        {p.latest_job ? STAGE_LABELS[p.latest_job.stage] : 'Queued'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
                History
              </h2>
              <div className="overflow-x-auto border border-white/[0.08]">
                <div className="grid min-w-[640px] grid-cols-[1fr_100px_80px_80px_90px_90px] gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                  <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                    Title
                  </span>
                  <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                    Industry
                  </span>
                  <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                    Reviews
                  </span>
                  <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                    Clusters
                  </span>
                  <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                    Status
                  </span>
                  <span className="text-right font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                    Date
                  </span>
                </div>
                {history.map((p, i, arr) => (
                  <Link
                    key={p.id}
                    href={
                      p.status === 'completed' ? `/research/${p.id}/report` : `/research/${p.id}`
                    }
                    className={cn(
                      'grid min-w-[640px] grid-cols-[1fr_100px_80px_80px_90px_90px] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]',
                      i < arr.length - 1 && 'border-b border-white/[0.06]',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-v-on">
                      <StatusDot status={p.status} />
                      <span className="truncate">{p.title}</span>
                    </span>
                    <span className="truncate text-sm text-v-muted">{p.category}</span>
                    <span className="font-landing-mono text-xs tabular-nums text-v-muted">
                      {p.latest_job?.stats.reviews_collected ?? '—'}
                    </span>
                    <span className="font-landing-mono text-xs tabular-nums text-v-muted">
                      {p.latest_job?.stats.pain_clusters_found ?? '—'}
                    </span>
                    <span className="font-landing-mono text-xs capitalize text-v-muted">
                      {p.status}
                    </span>
                    <span className="text-right text-xs text-v-muted">
                      {formatDate(p.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
