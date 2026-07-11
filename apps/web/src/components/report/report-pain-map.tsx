'use client'

import type { ReportPainCluster } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type PainTone = 'good' | 'caution' | 'bad'

const BAR_TONE: Record<PainTone, string> = {
  good: 'text-emerald-400',
  caution: 'text-[#d0bcff]',
  bad: 'text-[#ff4ec8]',
}

const FILL_TONE: Record<PainTone, string> = {
  good: 'bg-emerald-400',
  caution: 'bg-[#d0bcff]',
  bad: 'bg-[#ff4ec8]',
}

function painTone(score: number | null | undefined): PainTone {
  const value = score ?? 5
  if (value >= 7) return 'bad'
  if (value >= 4) return 'caution'
  return 'good'
}

function sortClusters(clusters: ReportPainCluster[]): ReportPainCluster[] {
  return [...clusters].sort((a, b) => {
    const scoreA = (a.severity_score ?? 0) * 1.2 + a.frequency * 0.05
    const scoreB = (b.severity_score ?? 0) * 1.2 + b.frequency * 0.05
    return scoreB - scoreA
  })
}

interface ReportPainMapProps {
  clusters: ReportPainCluster[]
  isPreview: boolean
  onReadEvidence: (clusterId: string) => void
}

export function ReportPainMap({ clusters, isPreview, onReadEvidence }: ReportPainMapProps) {
  const sorted = sortClusters(clusters).slice(0, 8)

  if (clusters.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 p-4 text-sm text-[#958ea0]">
        No pain patterns identified yet.
      </p>
    )
  }

  if (isPreview) {
    return (
      <ul className="space-y-2 rounded-xl border border-white/10 bg-[#1c1b1d]/50 p-4">
        {sorted.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between"
          >
            <span className="truncate text-[#e5e1e4]">{c.title}</span>
            <span className="shrink-0 font-mono text-xs text-[#958ea0]">{c.frequency} mentions</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map((cluster) => {
        const score = cluster.severity_score ?? cluster.commercial_opportunity ?? 5
        const filled = Math.round((score / 10) * 10)
        const tone = painTone(score)
        return (
          <div
            key={cluster.id}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate text-sm font-semibold text-[#e5e1e4]">{cluster.title}</p>
              <p className="font-mono text-xs tracking-tight">
                <span className={BAR_TONE[tone]}>{'█'.repeat(filled)}</span>
                <span className="text-white/15">{'░'.repeat(10 - filled)}</span>
                <span className="ml-1 text-[#958ea0]">{score.toFixed(1)}</span>
              </p>
              <p className="mt-1 font-mono text-xs text-[#958ea0]">{cluster.frequency} mentions</p>
            </div>
            <button
              type="button"
              onClick={() => onReadEvidence(cluster.id)}
              className="shrink-0 self-start rounded-lg border border-white/12 px-3 py-2 text-xs font-medium text-[#d0bcff] transition-colors hover:border-[#d0bcff]/40 hover:bg-[#d0bcff]/10 sm:self-center"
            >
              Read evidence ↓
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ReportPainDistribution({ clusters }: { clusters: ReportPainCluster[] }) {
  if (clusters.length === 0) return null

  const sorted = sortClusters(clusters).slice(0, 6)
  const maxFreq = Math.max(...sorted.map((c) => c.frequency), 1)

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-5">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
        Pain distribution
      </p>
      <div className="space-y-3">
        {sorted.map((cluster) => {
          const width = Math.round((cluster.frequency / maxFreq) * 100)
          const score = cluster.severity_score ?? cluster.commercial_opportunity ?? 5
          const tone = painTone(score)
          return (
            <div key={cluster.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate text-xs text-[#cbc3d7]">{cluster.title}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={cn('h-full transition-all', FILL_TONE[tone])}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-xs tabular-nums text-[#958ea0]">{cluster.frequency}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
