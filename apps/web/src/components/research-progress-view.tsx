'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listCompetitors } from '@/lib/api/competitors'
import { ApiError } from '@/lib/api/client'
import { cancelProject, getProjectStatus, retryProject } from '@/lib/api/projects'
import { STAGE_DESCRIPTIONS, STAGE_LABELS } from '@/lib/api/types'
import { AnalysisTheater } from '@/components/analysis-theater'
import { CompetitorList } from '@/components/competitor-list'
import { ManualCompetitorForm } from '@/components/manual-competitor-form'
import { StageStepper } from '@/components/stage-stepper'
import { StateScreen } from '@/components/state-screen'

interface ResearchProgressViewProps {
  projectId: string
}

const primaryBtn =
  'inline-flex rounded-md bg-v-on px-5 py-2.5 text-sm font-medium text-v-bg transition-opacity hover:opacity-90'
const secondaryBtn =
  'inline-flex rounded-md border border-white/14 px-5 py-2.5 text-sm font-medium text-v-on transition-colors hover:border-white/28'

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
        stats={{
          reviewsCollected: 0,
          patternsFound: 0,
          competitorsChecked: 0,
          competitorsTotal: 0,
        }}
      />
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8">
        <StateScreen
          figure="error"
          title="Couldn’t load this research"
          description="We lost the connection to this analysis for a moment. Try again, or return to your workspace."
          primaryAction={{
            label: 'Try again',
            onClick: () => {
              void refetch()
            },
          }}
          secondaryAction={{ label: 'Back to dashboard', href: '/dashboard' }}
        />
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
    job.stage === 'queued' && job.status === 'queued' && !job.started_at && jobAgeMs > 20_000
  const insufficientCompetitors = isFailed && job.error?.code === 'insufficient_competitors'
  const competitors = competitorsData?.items ?? []
  const failureMessage = typeof job.error?.message === 'string' ? job.error.message : null
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
        startedAt={job.started_at ?? job.created_at}
        stats={{
          reviewsCollected: job.stats.reviews_collected ?? 0,
          patternsFound: job.stats.pain_clusters_found ?? 0,
          competitorsChecked: job.stats.competitors_scraped ?? 0,
          competitorsTotal: job.stats.competitors_found || competitors.length,
        }}
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
        <Link href="/dashboard" className="text-sm text-v-muted transition-colors hover:text-v-on">
          Dashboard
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium text-v-on">Research in progress</span>
      </div>

      <div className="mb-8">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-v-on">
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
        <p className="text-sm text-v-muted">
          {isCancelled
            ? 'You can go back to the dashboard and start a new analysis with updated inputs.'
            : isStuckQueued
              ? 'The previous run never left the queue. Restart to begin competitor discovery.'
              : STAGE_DESCRIPTIONS[job.stage]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]">
        <div className="space-y-6">
          {isCancelled && (
            <div className="space-y-4 rounded-lg border border-white/[0.08] bg-v-surface p-5">
              <p className="text-sm leading-relaxed text-v-muted">
                This run was stopped. Start fresh when you are ready to change your idea or settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/research/new" className={primaryBtn}>
                  Start new analysis
                </Link>
                <Link href="/dashboard" className={secondaryBtn}>
                  Back to dashboard
                </Link>
              </div>
            </div>
          )}

          {!isRunning && !isCancelled && (
            <div className="rounded-lg border border-white/[0.08] bg-v-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-landing-mono text-xs uppercase tracking-widest text-v-muted">
                  Progress
                </span>
                <span className="text-sm text-v-muted">{job.progress_pct}%</span>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-v-primary transition-all"
                  style={{ width: `${job.progress_pct}%` }}
                />
              </div>
              <p className="text-sm text-v-muted">{STAGE_LABELS[job.stage]}</p>
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
            <div className="rounded-lg border border-v-warn/25 bg-v-warn/8 p-4 text-sm text-v-warn">
              We could not collect enough customer feedback this time. The report may be less
              detailed — try running the analysis again later.
            </div>
          )}

          {(hasPartialReviews || scraperBlocked) && !hasNoReviews && !isFailed && (
            <div className="rounded-lg border border-v-warn/25 bg-v-warn/8 p-4 text-sm text-v-warn">
              We only collected part of the available feedback (
              {job.stats.reviews_collected.toLocaleString()} reviews). Results may be directional
              rather than complete.
            </div>
          )}

          {hasInsufficientReviews && !hasNoReviews && !hasPartialReviews && !isFailed && (
            <div className="rounded-lg border border-v-warn/25 bg-v-warn/8 p-4 text-sm text-v-warn">
              Collected {job.stats.reviews_collected.toLocaleString()} reviews — fewer than the
              recommended 100. The report will note limited data confidence.
            </div>
          )}

          {isStuckQueued && (
            <div className="space-y-3 rounded-lg border border-v-warn/25 bg-v-warn/8 p-4">
              <p className="text-sm text-v-warn">
                The analysis did not start on its own. Tap below to run it again.
              </p>
              {retryError && <p className="text-sm text-v-error">{retryError}</p>}
              <button type="button" onClick={handleRetry} className={primaryBtn}>
                Restart analysis
              </button>
            </div>
          )}

          {isFailed && failureMessage && <p className="text-sm text-v-error">{failureMessage}</p>}

          {isFailed && (
            <div className="space-y-3">
              {retryError && <p className="text-sm text-v-error">{retryError}</p>}
              <button type="button" onClick={handleRetry} className={primaryBtn}>
                Retry analysis
              </button>
            </div>
          )}

          {isComplete && (
            <div className="space-y-3 rounded-lg border border-v-tertiary/25 bg-v-tertiary/10 p-5">
              <p className="text-sm text-v-tertiary">
                Analysis finished — {job.stats.pain_clusters_found} pain cluster
                {job.stats.pain_clusters_found === 1 ? '' : 's'} identified.
              </p>
              <Link href={`/research/${projectId}/report`} className={primaryBtn}>
                View report
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <StatCard label="Competitors found" value={job.stats.competitors_found} />
          <StatCard label="Reviews collected" value={job.stats.reviews_collected} />
          <StatCard label="Pain clusters" value={job.stats.pain_clusters_found} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-v-surface p-4">
      <p className="mb-2 font-landing-mono text-xs uppercase tracking-wider text-v-muted">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-v-on">{value.toLocaleString()}</p>
    </div>
  )
}
