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
import type { MarketSaturation } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface ReportViewProps {
  projectId: string
}

const SATURATION_COLORS: Record<MarketSaturation, string> = {
  HIGH: 'border-[#ff4ec8]/40 bg-[#ff4ec8]/12 text-[#ff8adf]',
  MEDIUM: 'border-[#d0bcff]/35 bg-[#d0bcff]/10 text-[#d0bcff]',
  LOW: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300',
}

const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#1c1b1d] px-3 py-1.5 text-sm text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/35 hover:text-[#d0bcff] disabled:opacity-50'

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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:px-8">
        <p className="mb-4 text-sm text-[#ff8adf]">Report is not available yet.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => refetch()} className={ghostBtn}>
            Retry
          </button>
          <Link href={`/research/${projectId}`} className={ghostBtn}>
            Back to progress
          </Link>
        </div>
      </div>
    )
  }

  const { idea, scores } = data
  const isPreview = data.access_level === 'preview'

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-56 w-56 rounded-full bg-[#d0bcff]/10 blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 h-40 w-40 rounded-full bg-[#ff4ec8]/8 blur-[80px]" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-[#958ea0] transition-colors hover:text-[#d0bcff]">
            Dashboard
          </Link>
          <span className="text-white/20">/</span>
          <span className="font-medium text-[#e5e1e4]">Report</span>
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
          <span className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">
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
        <h1 className="text-2xl font-semibold tracking-tight text-[#e5e1e4]">{idea.title}</h1>
      </motion.header>

      <ReportTimeSavedBanner report={data} />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('report')}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'report'
              ? 'border-[#d0bcff]/45 bg-[#d0bcff]/15 text-[#d0bcff]'
              : 'border-white/10 text-[#958ea0] hover:border-[#d0bcff]/30 hover:text-[#cbc3d7]',
          )}
        >
          Report
        </button>
        <button
          type="button"
          onClick={() => openEvidence()}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'evidence'
              ? 'border-[#d0bcff]/45 bg-[#d0bcff]/15 text-[#d0bcff]'
              : 'border-white/10 text-[#958ea0] hover:border-[#d0bcff]/30 hover:text-[#cbc3d7]',
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
            <div className="mb-6 rounded-xl border border-[#d0bcff]/25 bg-[#d0bcff]/8 p-4 text-sm text-[#cbc3d7]">
              <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#d0bcff]">
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
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">Pain map</h2>
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
        </>
      )}

      <AppFeedbackPrompt projectId={projectId} />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} highlightPack="starter" />
    </div>
  )
}
