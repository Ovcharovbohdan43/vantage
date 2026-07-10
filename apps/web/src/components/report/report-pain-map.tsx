'use client'

import type { ReportPainCluster } from '@/lib/api/types'

type PainTone = 'good' | 'caution' | 'bad'

const BAR_TONE: Record<PainTone, string> = {
  good: 'text-emerald-600',
  caution: 'text-amber-600',
  bad: 'text-red-600',
}

const FILL_TONE: Record<PainTone, string> = {
  good: 'bg-emerald-500',
  caution: 'bg-amber-500',
  bad: 'bg-red-500',
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
      <p className="text-sm text-zinc-500 border border-zinc-200 p-4">No pain patterns identified yet.</p>
    )
  }

  if (isPreview) {
    return (
      <ul className="space-y-2 border border-zinc-200 p-4">
        {sorted.map((c) => (
          <li key={c.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-baseline text-sm">
            <span className="text-zinc-800 truncate">{c.title}</span>
            <span className="font-mono text-xs text-zinc-400 shrink-0">{c.frequency} mentions</span>
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
            className="border border-zinc-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-950 mb-1 truncate">{cluster.title}</p>
              <p className="font-mono text-xs tracking-tight">
                <span className={BAR_TONE[tone]}>{'█'.repeat(filled)}</span>
                <span className="text-zinc-200">{'░'.repeat(10 - filled)}</span>
                <span className="text-zinc-400 ml-1">{score.toFixed(1)}</span>
              </p>
              <p className="text-xs font-mono text-zinc-400 mt-1">{cluster.frequency} mentions</p>
            </div>
            <button
              type="button"
              onClick={() => onReadEvidence(cluster.id)}
              className="text-xs font-medium text-zinc-950 border border-zinc-200 px-3 py-2 hover:bg-zinc-50 shrink-0 self-start sm:self-center"
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
    <div className="border border-zinc-200 bg-white p-5 mt-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-4">Pain distribution</p>
      <div className="space-y-3">
        {sorted.map((cluster) => {
          const width = Math.round((cluster.frequency / maxFreq) * 100)
          const score = cluster.severity_score ?? cluster.commercial_opportunity ?? 5
          const tone = painTone(score)
          return (
            <div key={cluster.id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-700 truncate">{cluster.title}</span>
                </div>
                <div className="h-2 bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full transition-all ${FILL_TONE[tone]}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-400 tabular-nums">{cluster.frequency}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
