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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <p className="text-sm text-red-600">
          Could not load projects. Check that the API is running and DATABASE_URL is configured.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950">Research workspace</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {projects.length === 0
              ? 'No analyses yet'
              : `${projects.length} ${projects.length === 1 ? 'analysis' : 'analyses'}`}
          </p>
        </div>
        <Link
          href="/research/new"
          className="inline-flex items-center justify-center text-sm bg-zinc-950 text-white px-4 py-2 hover:bg-zinc-800 transition-colors font-medium"
        >
          New analysis
        </Link>
      </div>

      {credits && <CreditsMeter credits={credits} className="mb-8" />}

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                'text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors',
                filter === option.id
                  ? 'bg-zinc-950 text-white border-zinc-950'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400',
              )}
            >
              {option.label} ({counts[option.id]})
            </button>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="border border-dashed border-zinc-200 py-16 px-8 text-center">
          <ChartLineUp size={40} weight="duotone" className="mx-auto mb-4 text-zinc-300" aria-hidden />
          <h2 className="text-sm font-medium text-zinc-950 mb-2">Start your first market analysis</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6 leading-relaxed">
            Describe your product idea and we&apos;ll analyze competitor reviews from G2 and Capterra to
            surface real user pain points.
          </p>
          <Link
            href="/research/new"
            className="inline-flex items-center justify-center text-sm bg-zinc-950 text-white px-4 py-2 hover:bg-zinc-800 transition-colors font-medium"
          >
            New analysis
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 border border-zinc-200 p-6 text-center">
          No analyses match this filter.
        </p>
      ) : (
        <div className="space-y-10">
          {running.length > 0 && (
            <section>
              <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4">Running</h2>
              <div className="space-y-2">
                {running.map((p) => (
                  <Link
                    key={p.id}
                    href={`/research/${p.id}`}
                    className="block border border-zinc-200 p-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-zinc-950 truncate">{p.title}</span>
                      <span className="text-xs text-zinc-400 border border-zinc-200 px-2 py-0.5 shrink-0">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 h-1 bg-zinc-100 max-w-xs min-w-[120px]">
                        <div
                          className="h-1 bg-blue-600 transition-all"
                          style={{ width: `${p.latest_job?.progress_pct ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-zinc-500">
                        {p.latest_job?.progress_pct ?? 0}%
                      </span>
                      <span className="text-xs text-zinc-400">
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
              <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4">History</h2>
              <div className="border border-zinc-200 overflow-x-auto">
                <div className="grid grid-cols-[1fr_100px_80px_80px_80px_90px] gap-3 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50 min-w-[640px]">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Title</span>
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Industry</span>
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Reviews</span>
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Clusters</span>
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Status</span>
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider text-right">Date</span>
                </div>
                {history.map((p, i, arr) => (
                  <Link
                    key={p.id}
                    href={p.status === 'completed' ? `/research/${p.id}/report` : `/research/${p.id}`}
                    className={cn(
                      'grid grid-cols-[1fr_100px_80px_80px_80px_90px] gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors min-w-[640px]',
                      i < arr.length - 1 && 'border-b border-zinc-100',
                    )}
                  >
                    <span className="text-sm font-medium text-zinc-900 truncate">{p.title}</span>
                    <span className="text-sm text-zinc-500 truncate">{p.category}</span>
                    <span className="text-xs font-mono text-zinc-500 tabular-nums">
                      {p.latest_job?.stats.reviews_collected ?? '—'}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 tabular-nums">
                      {p.latest_job?.stats.pain_clusters_found ?? '—'}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-mono w-fit px-2 py-0.5 border h-fit',
                        p.status === 'completed'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : p.status === 'cancelled'
                            ? 'text-zinc-600 bg-zinc-50 border-zinc-200'
                          : 'text-red-700 bg-red-50 border-red-200',
                      )}
                    >
                      {p.status}
                    </span>
                    <span className="text-xs text-zinc-400 text-right">{formatDate(p.created_at)}</span>
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
