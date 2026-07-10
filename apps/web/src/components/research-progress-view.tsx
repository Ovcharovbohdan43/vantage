'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChartLineUp, Quotes, UsersThree } from '@phosphor-icons/react'
import { listCompetitors } from '@/lib/api/competitors'
import { cancelProject, getProjectStatus, retryProject } from '@/lib/api/projects'
import { STAGE_DESCRIPTIONS, STAGE_LABELS } from '@/lib/api/types'
import { AnalysisLoadingView } from '@/components/analysis-loading-view'
import { CompetitorList } from '@/components/competitor-list'
import { ManualCompetitorForm } from '@/components/manual-competitor-form'
import { StageStepper } from '@/components/stage-stepper'
import { Button } from '@/components/ui/button'

interface ResearchProgressViewProps {
  projectId: string
}

export function ResearchProgressView({ projectId }: ResearchProgressViewProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cancelRequested, setCancelRequested] = useState(false)

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

  const showCompetitors =
    data?.job.stage === 'finding_competitors' ||
    data?.job.stage === 'failed' ||
    (data?.job.stats.competitors_found ?? 0) > 0

  const { data: competitorsData, isLoading: competitorsLoading } = useQuery({
    queryKey: ['competitors', projectId],
    queryFn: () => listCompetitors(projectId),
    enabled: showCompetitors,
    refetchInterval: data?.job.stage === 'finding_competitors' ? 2000 : false,
  })

  useEffect(() => {
    if (data?.job.stage === 'completed') {
      const timer = setTimeout(() => router.push(`/research/${projectId}/report`), 2500)
      return () => clearTimeout(timer)
    }
  }, [data?.job.stage, projectId, router])

  if (isLoading) {
    return <AnalysisLoadingView stage="initial" />
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-16 text-center">
        <p className="text-sm text-red-600 mb-4">Could not load research status.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
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
    await retryProject(projectId)
    refetch()
  }

  function handleCancelClick() {
    setCancelRequested(true)
  }

  function handleCancelConfirm() {
    cancelMutation.mutate()
  }

  function handleCancelDismiss() {
    setCancelRequested(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-950 transition-colors">
          Dashboard
        </Link>
        <span className="text-zinc-200">/</span>
        <span className="text-sm text-zinc-950 font-medium">Research in progress</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-950 mb-1">
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
        <p className="text-sm text-zinc-500">
          {isCancelled
            ? 'You can go back to the dashboard and start a new analysis with updated inputs.'
            : isStuckQueued
            ? 'The previous run never left the queue. Restart to begin competitor discovery.'
            : STAGE_DESCRIPTIONS[job.stage]}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-6">
          {isRunning && (
            <>
              <AnalysisLoadingView
                stage={job.stage}
                progressPct={job.progress_pct}
                variant="inline"
              />
              {cancelRequested ? (
                <div className="border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  <p className="text-sm text-zinc-700">
                    Stop this analysis? You can start again later with different inputs.
                    Paid credits are returned when you cancel a full analysis.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelConfirm}
                      disabled={cancelMutation.isPending}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel analysis'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelDismiss} disabled={cancelMutation.isPending}>
                      Keep running
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={handleCancelClick} className="w-full sm:w-auto">
                  Cancel analysis
                </Button>
              )}
            </>
          )}

          {isCancelled && (
            <div className="border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <p className="text-sm text-zinc-700">
                This run was stopped. Start fresh when you are ready to change your idea or settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/research/new">
                  <Button className="px-6">Start new analysis</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">Back to dashboard</Button>
                </Link>
              </div>
            </div>
          )}

          {!isRunning && !isCancelled && (
            <div className="border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-zinc-400">Progress</span>
                <span className="text-sm text-zinc-700">{job.progress_pct}%</span>
              </div>
              <div className="h-2 bg-zinc-100 mb-2 overflow-hidden">
                <motion.div
                  className="h-2 bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress_pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-sm text-zinc-600">{STAGE_LABELS[job.stage]}</p>
            </div>
          )}

          {!isRunning && !isCancelled && <StageStepper currentStage={job.stage} failed={isFailed} />}

          {(showCompetitors || competitors.length > 0) && (
            <CompetitorList competitors={competitors} loading={competitorsLoading && competitors.length === 0} />
          )}

          {insufficientCompetitors && (
            <ManualCompetitorForm
              projectId={projectId}
              currentTotal={competitors.length}
              requiredTotal={3}
            />
          )}

          {hasNoReviews && !isFailed && (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              We could not collect enough customer feedback this time. The report may be less
              detailed — try running the analysis again later.
            </div>
          )}

          {(hasPartialReviews || scraperBlocked) && !hasNoReviews && !isFailed && (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              We only collected part of the available feedback ({job.stats.reviews_collected.toLocaleString()}{' '}
              reviews). Results may be directional rather than complete.
            </div>
          )}

          {hasInsufficientReviews && !hasNoReviews && !hasPartialReviews && !isFailed && (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Collected {job.stats.reviews_collected.toLocaleString()} reviews — fewer than the recommended 100.
              The report will note limited data confidence.
            </div>
          )}

          {isStuckQueued && (
            <div className="border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm text-amber-900">
                The analysis did not start on its own. Tap below to run it again.
              </p>
              <Button onClick={handleRetry} className="px-6">
                Restart analysis
              </Button>
            </div>
          )}

          {isFailed && failureMessage && (
            <p className="text-sm text-red-600">{failureMessage}</p>
          )}

          {isFailed && (
            <Button onClick={handleRetry} className="px-6">
              Retry analysis
            </Button>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-emerald-200 bg-emerald-50 p-4 space-y-3"
            >
              <p className="text-sm text-emerald-900">
                Analysis finished — {job.stats.pain_clusters_found} pain cluster
                {job.stats.pain_clusters_found === 1 ? '' : 's'} identified.
              </p>
              <Link href={`/research/${projectId}/report`}>
                <Button className="px-6">View report</Button>
              </Link>
            </motion.div>
          )}
        </div>

        <div className="space-y-3">
          <StatCard
            icon={<UsersThree size={20} weight="duotone" />}
            label="Competitors found"
            value={job.stats.competitors_found}
            active={isRunning && job.stage === 'finding_competitors'}
          />
          <StatCard
            icon={<Quotes size={20} weight="duotone" />}
            label="Reviews collected"
            value={job.stats.reviews_collected}
            active={isRunning && job.stage === 'collecting_reviews'}
          />
          <StatCard
            icon={<ChartLineUp size={20} weight="duotone" />}
            label="Pain clusters"
            value={job.stats.pain_clusters_found}
            active={isRunning && (job.stage === 'analyzing' || job.stage === 'generating_report')}
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
  active,
}: {
  icon: React.ReactNode
  label: string
  value: number
  active?: boolean
}) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ repeat: active ? Infinity : 0, duration: 2 }}
      className="border border-zinc-200 p-4"
    >
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <motion.p
        key={value}
        initial={{ opacity: 0.5, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-semibold tabular-nums text-zinc-950"
      >
        {value.toLocaleString()}
      </motion.p>
    </motion.div>
  )
}
