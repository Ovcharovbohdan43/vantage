'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChartLineUp } from '@phosphor-icons/react'
import { listProjects } from '@/lib/api/projects'
import { getCredits } from '@/lib/api/billing'
import { STAGE_LABELS, type Project } from '@/lib/api/types'
import { DashboardSkeleton } from '@/components/ui/skeleton-card'
import { CreditsMeter } from '@/components/credits-meter'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'running' | 'completed' | 'failed'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(iso),
  )
}

function matchesFilter(project: Project, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'running') return project.status === 'running' || project.status === 'queued'
  return project.status === filter
}

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
]

export function DashboardView() {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const { data, isLoading, isError } = useQuery({
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
        <p className="text-sm text-[#ffb4ab]">
          Could not load projects. Check that the API is running and DATABASE_URL is configured.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#e5e1e4]">Research workspace</h1>
          <p className="mt-0.5 text-sm text-[#cbc3d7]">
            {projects.length === 0
              ? 'No analyses yet'
              : `${projects.length} ${projects.length === 1 ? 'analysis' : 'analyses'}`}
          </p>
        </div>
        <Link
          href="/research/new"
          className="landing-primary-glow inline-flex items-center justify-center rounded-lg bg-[#d0bcff] px-4 py-2 text-sm font-semibold text-[#3c0091] transition-transform hover:-translate-y-0.5"
        >
          New analysis
        </Link>
      </div>

      {credits && <CreditsMeter credits={credits} className="mb-8" />}

      {projects.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors',
                filter === option.id
                  ? 'border-[#d0bcff]/50 bg-[#d0bcff]/15 text-[#d0bcff]'
                  : 'border-white/10 bg-transparent text-[#cbc3d7] hover:border-[#d0bcff]/30 hover:text-[#e5e1e4]',
              )}
            >
              {option.label} ({counts[option.id]})
            </button>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-8 py-16 text-center">
          <ChartLineUp size={40} weight="duotone" className="mx-auto mb-4 text-[#d0bcff]/50" aria-hidden />
          <h2 className="mb-2 text-sm font-medium text-[#e5e1e4]">Start your first market analysis</h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#cbc3d7]">
            Describe your product idea and we&apos;ll analyze competitor reviews from G2 and Capterra to
            surface real user pain points.
          </p>
          <Link
            href="/research/new"
            className="landing-primary-glow inline-flex items-center justify-center rounded-lg bg-[#d0bcff] px-4 py-2 text-sm font-semibold text-[#3c0091]"
          >
            New analysis
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-[#cbc3d7]">
          No analyses match this filter.
        </p>
      ) : (
        <div className="space-y-10">
          {running.length > 0 && (
            <section>
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[#958ea0]">
                Running
              </h2>
              <div className="space-y-2">
                {running.map((p) => (
                  <Link
                    key={p.id}
                    href={`/research/${p.id}`}
                    className="block rounded-xl border border-[#d0bcff]/25 bg-[#201f22]/60 p-4 transition-colors hover:border-[#d0bcff]/45 hover:bg-[#201f22]"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <span className="truncate text-sm font-medium text-[#e5e1e4]">{p.title}</span>
                      <span className="shrink-0 rounded border border-white/10 px-2 py-0.5 text-xs text-[#cbc3d7]">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="h-1 min-w-[120px] max-w-xs flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-[#ff4ec8] to-[#d0bcff] transition-all"
                          style={{ width: `${p.latest_job?.progress_pct ?? 0}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-[#cbc3d7]">
                        {p.latest_job?.progress_pct ?? 0}%
                      </span>
                      <span className="text-xs text-[#ff8adf]">
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
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[#958ea0]">
                History
              </h2>
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1c1b1d]/50">
                <div className="grid min-w-[640px] grid-cols-[1fr_100px_80px_80px_80px_90px] gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-2.5">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#958ea0]">Title</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#958ea0]">Industry</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#958ea0]">Reviews</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#958ea0]">Clusters</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#958ea0]">Status</span>
                  <span className="text-right font-mono text-xs uppercase tracking-wider text-[#958ea0]">
                    Date
                  </span>
                </div>
                {history.map((p, i, arr) => (
                  <Link
                    key={p.id}
                    href={p.status === 'completed' ? `/research/${p.id}/report` : `/research/${p.id}`}
                    className={cn(
                      'grid min-w-[640px] grid-cols-[1fr_100px_80px_80px_80px_90px] gap-3 px-4 py-3.5 transition-colors hover:bg-[#d0bcff]/5',
                      i < arr.length - 1 && 'border-b border-white/6',
                    )}
                  >
                    <span className="truncate text-sm font-medium text-[#e5e1e4]">{p.title}</span>
                    <span className="truncate text-sm text-[#cbc3d7]">{p.category}</span>
                    <span className="font-mono text-xs tabular-nums text-[#cbc3d7]">
                      {p.latest_job?.stats.reviews_collected ?? '—'}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-[#cbc3d7]">
                      {p.latest_job?.stats.pain_clusters_found ?? '—'}
                    </span>
                    <span
                      className={cn(
                        'h-fit w-fit rounded border px-2 py-0.5 font-mono text-xs',
                        p.status === 'completed'
                          ? 'border-[#4edea3]/30 bg-[#4edea3]/10 text-[#4edea3]'
                          : p.status === 'cancelled'
                            ? 'border-white/15 bg-white/5 text-[#cbc3d7]'
                            : 'border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]',
                      )}
                    >
                      {p.status}
                    </span>
                    <span className="text-right text-xs text-[#958ea0]">{formatDate(p.created_at)}</span>
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
