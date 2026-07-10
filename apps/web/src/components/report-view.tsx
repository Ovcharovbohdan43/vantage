'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, RotateCcw } from 'lucide-react'
import { AnalysisLoadingView } from '@/components/analysis-loading-view'
import { FullReportCta } from '@/components/full-report-cta'
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
  ReportVerdictHero,
} from '@/components/report/report-hero'
import { ReportPainDistribution, ReportPainMap } from '@/components/report/report-pain-map'
import { Button } from '@/components/ui/button'
import { getProjectReport } from '@/lib/api/report'
import { getCredits } from '@/lib/api/billing'
import { retryProject } from '@/lib/api/projects'
import { downloadReportMarkdown } from '@/lib/report-export'
import type { MarketSaturation } from '@/lib/api/types'

interface ReportViewProps {
  projectId: string
}

const SATURATION_COLORS: Record<MarketSaturation, string> = {
  HIGH: 'text-red-700 bg-red-50 border-red-200',
  MEDIUM: 'text-amber-800 bg-amber-50 border-amber-200',
  LOW: 'text-emerald-800 bg-emerald-50 border-emerald-200',
}

export function ReportView({ projectId }: ReportViewProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'report' | 'evidence'>('report')
  const [evidenceClusterId, setEvidenceClusterId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project-report', projectId],
    queryFn: () => getProjectReport(projectId),
  })

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
  })

  const rerunMutation = useMutation({
    mutationFn: () => retryProject(projectId),
    onSuccess: () => router.push(`/research/${projectId}`),
  })

  function openEvidence(clusterId?: string) {
    if (clusterId) setEvidenceClusterId(clusterId)
    setTab('evidence')
  }

  if (isLoading) return <AnalysisLoadingView stage="report" />

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-16 text-center">
        <p className="text-sm text-red-600 mb-4">Report is not available yet.</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Link href={`/research/${projectId}`}>
            <Button variant="outline">Back to progress</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { idea, scores } = data
  const isPreview = data.access_level === 'preview'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-950 transition-colors">
            Dashboard
          </Link>
          <span className="text-zinc-200">/</span>
          <span className="text-zinc-950 font-medium">Report</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadReportMarkdown(data)}
            className="gap-1.5"
          >
            <Download size={14} />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rerunMutation.isPending}
            onClick={() => rerunMutation.mutate()}
            className="gap-1.5"
          >
            <RotateCcw size={14} />
            {rerunMutation.isPending ? 'Starting…' : 'Re-run'}
          </Button>
        </div>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">{idea.category}</span>
          <span className={`text-xs font-medium border px-2 py-0.5 ${SATURATION_COLORS[scores.market_saturation]}`}>
            {scores.market_saturation} saturation
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-950">{idea.title}</h1>
      </motion.header>

      <ReportTimeSavedBanner report={data} />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('report')}
          className={`text-xs font-mono uppercase tracking-widest px-3 py-1.5 border ${
            tab === 'report' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 text-zinc-500'
          }`}
        >
          Report
        </button>
        <button
          type="button"
          onClick={() => openEvidence()}
          className={`text-xs font-mono uppercase tracking-widest px-3 py-1.5 border ${
            tab === 'evidence' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 text-zinc-500'
          }`}
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
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-6">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-700 block mb-1">
                Free preview
              </span>
              First screen shows market signals. Unlock for verdict, pain map, competitor depth, and all
              customer quotes.
            </div>
          )}

          <ReportExecutiveSummary report={data} isPreview={isPreview} />
          <ReportVerdictHero report={data} isPreview={isPreview} />
          <ReportAnalysisTimeline report={data} />

          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Pain map</h2>
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

          <ReportCompetitorsSection competitors={data.competitors} isPreview={isPreview} />

          <ReportDeepDive report={data} isPreview={isPreview} />

          {isPreview && credits && <FullReportCta projectId={projectId} credits={credits} />}
        </>
      )}
    </div>
  )
}
