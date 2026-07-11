'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChartLineUp, Quotes, UsersThree } from '@phosphor-icons/react'
import { listCompetitors } from '@/lib/api/competitors'
import { ApiError } from '@/lib/api/client'
import { cancelProject, getProjectStatus, retryProject } from '@/lib/api/projects'
import { STAGE_DESCRIPTIONS, STAGE_LABELS } from '@/lib/api/types'
import { AnalysisTheater } from '@/components/analysis-theater'
import { CompetitorList } from '@/components/competitor-list'
import { ManualCompetitorForm } from '@/components/manual-competitor-form'
import { StageStepper } from '@/components/stage-stepper'

interface ResearchProgressViewProps {
  projectId: string
}

export function ResearchProgressView({ projectId }: ResearchProgressViewProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cancelRequested, setCancelRequested] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project-status', projectId],
    queryFn: () => getProjectStatus(projectId),
    refetchInterval: (query) => {
      const stage = query.state.data?.job.stage
      const status = query.state.data?.job.status
      if (stage === 'completed' || stage === 'failed' || stage === 'cancelled') return false
      if (status === 'cancelled') return false
      return 2000
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelProject(projectId),
    onSuccess: () => {
      setCancelRequested(false)
      queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
      refetch()
    },
    onError: () => setCancelRequested(false),
  })

  const jobStage = data?.job.stage
  const jobStatus = data?.job.status
  const isRunningPreview =
    !!data &&
    jobStatus !== 'cancelled' &&
    jobStage !== 'cancelled' &&
    (jobStatus === 'running' || jobStatus === 'queued') &&
    jobStage !== 'completed' &&
    jobStage !== 'failed'

  const showCompetitors =
    isRunningPreview ||
    jobStage === 'finding_competitors' ||
    jobStage === 'failed' ||
    (data?.job.stats.competitors_found ?? 0) > 0

  const { data: competitorsData, isLoading: competitorsLoading } = useQuery({
    queryKey: ['competitors', projectId],
    queryFn: () => listCompetitors(projectId),
    enabled: showCompetitors || isLoading,
    refetchInterval: isRunningPreview || jobStage === 'finding_competitors' ? 2000 : false,
  })

  useEffect(() => {
    if (data?.job.stage === 'completed') {
      const timer = setTimeout(() => router.push(`/research/${projectId}/report`), 2500)
      return () => clearTimeout(timer)
    }
  }, [data?.job.stage, projectId, router])

  if (isLoading) {
    return (
      <AnalysisTheater
        stage="queued"
        competitors={competitorsData?.items ?? []}
        competitorsLoading
      />
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:px-8">
        <p className="mb-4 text-sm text-[#ffb4ab]">Could not load research status.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/40"
        >
          Retry
        </button>
      </div>
    )
  }

  const { job } = data
  const isCancelled = job.status === 'cancelled' || job.stage === 'cancelled'
  const isRunning = !isCancelled && (job.status === 'running' || job.status === 'queued')
  const isFailed = job.stage === 'failed'
  const isComplete = job.stage === 'completed'
  const jobAgeMs = Date.now() - new Date(job.created_at).getTime()
  const isStuckQueued =
    job.stage === 'queued' &&
    job.status === 'queued' &&
    !job.started_at &&
    jobAgeMs > 20_000
  const insufficientCompetitors =
    isFailed && job.error?.code === 'insufficient_competitors'
  const competitors = competitorsData?.items ?? []
  const failureMessage =
    typeof job.error?.message === 'string' ? job.error.message : null
  const warnings = job.stats.warnings ?? []
  const hasInsufficientReviews = warnings.includes('insufficient_reviews')
  const hasNoReviews = warnings.includes('no_reviews_collected')
  const hasPartialReviews = warnings.includes('partial_reviews')
  const scraperBlocked = warnings.includes('scraper_blocked')

  async function handleRetry() {
    setRetryError(null)
    try {
      await retryProject(projectId)
      await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
      refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
        setRetryError(err.message || 'Not enough credits to re-run this research.')
        return
      }
      setRetryError(err instanceof ApiError ? err.message : 'Failed to restart analysis')
    }
  }

  if (isRunning && !isStuckQueued) {
    return (
      <AnalysisTheater
        stage={job.stage}
        competitors={competitors}
        competitorsLoading={competitorsLoading && competitors.length === 0}
        onCancel={() => setCancelRequested(true)}
        cancelPending={cancelMutation.isPending}
        cancelConfirm={cancelRequested}
        onCancelConfirm={() => cancelMutation.mutate()}
        onCancelDismiss={() => setCancelRequested(false)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
        >
          Dashboard
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium text-[#e5e1e4]">Research in progress</span>
      </div>

      <div className="mb-8">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#e5e1e4]">
          {isComplete
            ? 'Analysis complete'
            : isCancelled
              ? 'Analysis cancelled'
              : isFailed
                ? 'Analysis failed'
                : isStuckQueued
                  ? 'Analysis did not start'
                  : 'Running market analysis'}
        </h1>
        <p className="text-sm text-[#cbc3d7]">
          {isCancelled
            ? 'You can go back to the dashboard and start a new analysis with updated inputs.'
            : isStuckQueued
              ? 'The previous run never left the queue. Restart to begin competitor discovery.'
              : STAGE_DESCRIPTIONS[job.stage]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {isCancelled && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5">
              <p className="text-sm leading-relaxed text-[#cbc3d7]">
                This run was stopped. Start fresh when you are ready to change your idea or settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/research/new"
                  className="landing-primary-glow inline-flex rounded-lg bg-[#d0bcff] px-5 py-2.5 text-sm font-semibold text-[#3c0091]"
                >
                  Start new analysis
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/40"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          )}

          {!isRunning && !isCancelled && (
            <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">
                  Progress
                </span>
                <span className="text-sm text-[#cbc3d7]">{job.progress_pct}%</span>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[#ff4ec8] to-[#d0bcff]"
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress_pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-sm text-[#cbc3d7]">{STAGE_LABELS[job.stage]}</p>
            </div>
          )}

          {!isRunning && !isCancelled && <StageStepper currentStage={job.stage} failed={isFailed} />}

          {(showCompetitors || competitors.length > 0) && (
            <CompetitorList
              competitors={competitors}
              loading={competitorsLoading && competitors.length === 0}
            />
          )}

          {insufficientCompetitors && (
            <ManualCompetitorForm
              projectId={projectId}
              currentTotal={competitors.length}
              requiredTotal={3}
            />
          )}

          {hasNoReviews && !isFailed && (
            <div className="rounded-xl border border-[#ffcc80]/25 bg-[#ffcc80]/8 p-4 text-sm text-[#ffcc80]">
              We could not collect enough customer feedback this time. The report may be less
              detailed — try running the analysis again later.
            </div>
          )}

          {(hasPartialReviews || scraperBlocked) && !hasNoReviews && !isFailed && (
            <div className="rounded-xl border border-[#ffcc80]/25 bg-[#ffcc80]/8 p-4 text-sm text-[#ffcc80]">
              We only collected part of the available feedback (
              {job.stats.reviews_collected.toLocaleString()} reviews). Results may be directional
              rather than complete.
            </div>
          )}

          {hasInsufficientReviews && !hasNoReviews && !hasPartialReviews && !isFailed && (
            <div className="rounded-xl border border-[#ffcc80]/25 bg-[#ffcc80]/8 p-4 text-sm text-[#ffcc80]">
              Collected {job.stats.reviews_collected.toLocaleString()} reviews — fewer than the
              recommended 100. The report will note limited data confidence.
            </div>
          )}

          {isStuckQueued && (
            <div className="space-y-3 rounded-xl border border-[#ffcc80]/25 bg-[#ffcc80]/8 p-4">
              <p className="text-sm text-[#ffcc80]">
                The analysis did not start on its own. Tap below to run it again.
              </p>
              {retryError && <p className="text-sm text-[#ffb4ab]">{retryError}</p>}
              <button
                type="button"
                onClick={handleRetry}
                className="landing-primary-glow inline-flex rounded-lg bg-[#d0bcff] px-5 py-2.5 text-sm font-semibold text-[#3c0091]"
              >
                Restart analysis
              </button>
            </div>
          )}

          {isFailed && failureMessage && (
            <p className="text-sm text-[#ffb4ab]">{failureMessage}</p>
          )}

          {isFailed && (
            <div className="space-y-3">
              {retryError && <p className="text-sm text-[#ffb4ab]">{retryError}</p>}
              <button
                type="button"
                onClick={handleRetry}
                className="landing-primary-glow inline-flex rounded-lg bg-[#d0bcff] px-5 py-2.5 text-sm font-semibold text-[#3c0091]"
              >
                Retry analysis
              </button>
            </div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-xl border border-[#4edea3]/25 bg-[#4edea3]/10 p-5"
            >
              <p className="text-sm text-[#4edea3]">
                Analysis finished — {job.stats.pain_clusters_found} pain cluster
                {job.stats.pain_clusters_found === 1 ? '' : 's'} identified.
              </p>
              <Link
                href={`/research/${projectId}/report`}
                className="landing-primary-glow inline-flex rounded-lg bg-[#d0bcff] px-5 py-2.5 text-sm font-semibold text-[#3c0091]"
              >
                View report
              </Link>
            </motion.div>
          )}
        </div>

        <div className="space-y-3">
          <StatCard
            icon={<UsersThree size={20} weight="duotone" />}
            label="Competitors found"
            value={job.stats.competitors_found}
          />
          <StatCard
            icon={<Quotes size={20} weight="duotone" />}
            label="Reviews collected"
            value={job.stats.reviews_collected}
          />
          <StatCard
            icon={<ChartLineUp size={20} weight="duotone" />}
            label="Pain clusters"
            value={job.stats.pain_clusters_found}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-4">
      <div className="mb-2 flex items-center gap-2 text-[#958ea0]">
        {icon}
        <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
      </div>
      <motion.p
        key={value}
        initial={{ opacity: 0.5, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-semibold tabular-nums text-[#d0bcff]"
      >
        {value.toLocaleString()}
      </motion.p>
    </div>
  )
}
