'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, RotateCcw } from 'lucide-react'
import { AnalysisLoadingView } from '@/components/analysis-loading-view'
import { AppFeedbackPrompt } from '@/components/app-feedback-prompt'
import { FullReportCta } from '@/components/full-report-cta'
import { PricingModal } from '@/components/pricing-modal'
import { ProjectEvidence } from '@/components/project-evidence'
import { ShareReport } from '@/components/share-report'
import { StateScreen } from '@/components/state-screen'
import {
  ReportCompetitorsSection,
  ReportCustomerVoicePreview,
} from '@/components/report/report-competitors'
import { ReportDeepDive } from '@/components/report/report-deep-dive'
import {
  ReportAnalysisTimeline,
  ReportExecutiveSummary,
  ReportTimeSavedBanner,
} from '@/components/report/report-hero'
import { ReportPainDistribution, ReportPainMap } from '@/components/report/report-pain-map'
import {
  ReportAiSummary,
  ReportBiggestOpportunities,
  ReportYearTrends,
} from '@/components/report/report-opportunities'
import { ReportOpportunitySize } from '@/components/report/report-opportunity-size'
import { getProjectReport } from '@/lib/api/report'
import { getCredits } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import { retryProject } from '@/lib/api/projects'
import { downloadReportMarkdown } from '@/lib/report-export'
import { buildAuthenticatedReportPost } from '@/lib/share-report'
import type { MarketSaturation } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface ReportViewProps {
  projectId: string
}

const SATURATION_COLORS: Record<MarketSaturation, string> = {
  HIGH: 'border-v-warn/40 bg-v-warn/12 text-v-warn',
  MEDIUM: 'border-v-primary/35 bg-v-primary/10 text-v-primary',
  LOW: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300',
}

const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-v-surface px-3 py-1.5 text-sm text-v-on transition-colors hover:border-v-primary/35 hover:text-v-primary disabled:opacity-50'

export function ReportView({ projectId }: ReportViewProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'report' | 'evidence'>('report')
  const [evidenceClusterId, setEvidenceClusterId] = useState<string | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project-report', projectId],
    queryFn: () => getProjectReport(projectId),
  })

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
    staleTime: 0,
  })

  const rerunMutation = useMutation({
    mutationFn: () => retryProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
      router.push(`/research/${projectId}`)
    },
    onError: async (err) => {
      if (err instanceof ApiError && err.status === 402) {
        await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
        setPricingOpen(true)
      }
    },
  })

  function openEvidence(clusterId?: string) {
    if (clusterId) setEvidenceClusterId(clusterId)
    setTab('evidence')
  }

  if (isLoading) return <AnalysisLoadingView stage="report" />

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8">
        <StateScreen
          figure="report"
          title="Report isn’t ready yet"
          description="This analysis doesn’t have a report to show right now. Check progress, or try loading again in a moment."
          primaryAction={{
            label: 'Try again',
            onClick: () => {
              void refetch()
            },
          }}
          secondaryAction={{ label: 'Back to progress', href: `/research/${projectId}` }}
        />
      </div>
    )
  }

  const { idea, scores } = data
  const isPreview = data.access_level === 'preview'

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-v-muted transition-colors hover:text-v-primary">
            Dashboard
          </Link>
          <span className="text-white/20">/</span>
          <span className="font-medium text-v-on">Report</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => downloadReportMarkdown(data)} className={ghostBtn}>
            <Download size={14} />
            Export
          </button>
          <button
            type="button"
            disabled={rerunMutation.isPending}
            onClick={() => rerunMutation.mutate()}
            className={ghostBtn}
          >
            <RotateCcw size={14} />
            {rerunMutation.isPending ? 'Starting…' : 'Re-run'}
          </button>
        </div>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-landing-mono text-xs uppercase tracking-widest text-v-muted">
            {idea.category}
          </span>
          <span
            className={cn(
              'rounded border px-2 py-0.5 text-xs font-medium',
              SATURATION_COLORS[scores.market_saturation],
            )}
          >
            {scores.market_saturation} saturation
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-v-on">{idea.title}</h1>
      </motion.header>

      <ReportTimeSavedBanner report={data} />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('report')}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-landing-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'report'
              ? 'border-v-primary/45 bg-v-primary/15 text-v-primary'
              : 'border-white/10 text-v-muted hover:border-v-primary/30 hover:text-v-muted',
          )}
        >
          Report
        </button>
        <button
          type="button"
          onClick={() => openEvidence()}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-landing-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'evidence'
              ? 'border-v-primary/45 bg-v-primary/15 text-v-primary'
              : 'border-white/10 text-v-muted hover:border-v-primary/30 hover:text-v-muted',
          )}
        >
          Customer voice
        </button>
      </div>

      {tab === 'evidence' ? (
        <ProjectEvidence
          projectId={projectId}
          initialClusterId={evidenceClusterId}
          disabled={isPreview}
          painClusters={data.pain_clusters}
        />
      ) : (
        <>
          {isPreview && (
            <div className="mb-6 rounded-xl border border-v-primary/25 bg-v-primary/8 p-4 text-sm text-v-muted">
              <span className="mb-1 block font-landing-mono text-xs uppercase tracking-widest text-v-primary">
                Free preview
              </span>
              First screen shows market signals. Unlock for complaint breakdowns, competitor tables,
              and all customer quotes.
            </div>
          )}

          <ReportExecutiveSummary report={data} isPreview={isPreview} />
          <ReportOpportunitySize report={data} isPreview={isPreview} />
          <ReportBiggestOpportunities
            report={data}
            isPreview={isPreview}
            onReadEvidence={(clusterId) => openEvidence(clusterId)}
          />
          <ReportYearTrends report={data} isPreview={isPreview} />
          <ReportCompetitorsSection competitors={data.competitors} isPreview={isPreview} />
          <ReportAiSummary report={data} isPreview={isPreview} />
          <ReportAnalysisTimeline report={data} />

          <section className="mb-8">
            <h2 className="mb-3 font-landing-mono text-xs uppercase tracking-widest text-v-muted">Pain map</h2>
            <ReportPainMap
              clusters={data.pain_clusters}
              isPreview={isPreview}
              onReadEvidence={openEvidence}
            />
            {!isPreview && <ReportPainDistribution clusters={data.pain_clusters} />}
          </section>

          <ReportCustomerVoicePreview
            clusters={data.pain_clusters}
            isPreview={isPreview}
            onViewAll={() => openEvidence()}
          />

          <ReportDeepDive report={data} isPreview={isPreview} />

          {isPreview && credits && <FullReportCta projectId={projectId} credits={credits} />}
          <ShareReport
            payload={buildAuthenticatedReportPost(data)}
            draftSource={{ kind: 'report', projectId }}
            className="mb-8"
          />
        </>
      )}

      <AppFeedbackPrompt projectId={projectId} />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} highlightPack="starter" />
    </div>
  )
}
