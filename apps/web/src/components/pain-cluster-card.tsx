'use client'

import { Quotes } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { ReportPainCluster } from '@/lib/api/types'

interface PainClusterCardProps {
  cluster: ReportPainCluster
  index: number
}

function MetricBar({ label, value, max = 10 }: { label: string; value: number | null; max?: number }) {
  if (value == null) return null
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wider text-zinc-400">{label}</span>
        <span className="tabular-nums text-zinc-600">{value.toFixed(1)}/{max}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 overflow-hidden">
        <div
          className="h-full bg-zinc-800 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function PainClusterCard({ cluster, index }: PainClusterCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: 'easeOut' }}
      className="border border-zinc-200 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-medium text-zinc-950 leading-snug">{cluster.title}</h3>
        <span className="text-xs font-mono text-zinc-500 shrink-0">{cluster.frequency} mentions</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <MetricBar label="Severity" value={cluster.severity_score} />
        <MetricBar label="Opportunity" value={cluster.commercial_opportunity} />
      </div>

      {cluster.description && (
        <p className="text-sm text-zinc-600 mb-3 leading-relaxed">{cluster.description}</p>
      )}

      {cluster.solution_direction && (
        <p className="text-sm text-zinc-700 mb-3 border-l-2 border-zinc-200 pl-3">
          <span className="font-medium text-zinc-950">Direction:</span> {cluster.solution_direction}
        </p>
      )}

      {cluster.quotes.length > 0 && (
        <details className="group mt-3 border-t border-zinc-100 pt-3">
          <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-800 transition-colors">
            <Quotes size={14} weight="duotone" />
            <span>{cluster.quotes.length} evidence quote{cluster.quotes.length === 1 ? '' : 's'}</span>
            <span className="ml-auto text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="space-y-3 mt-3">
            {cluster.quotes.map((quote) => (
              <blockquote
                key={`${quote.competitor}-${quote.text.slice(0, 40)}`}
                className="text-sm text-zinc-700 border-l-2 border-zinc-300 pl-3 italic leading-relaxed"
              >
                “{quote.text}”
                {(quote.competitor || quote.rating != null) && (
                  <span className="block not-italic text-xs text-zinc-400 mt-1.5">
                    {quote.competitor}
                    {quote.rating != null ? ` · ${quote.rating}/5` : ''}
                    {quote.source ? ` · ${quote.source.toUpperCase()}` : ''}
                  </span>
                )}
              </blockquote>
            ))}
          </div>
        </details>
      )}
    </motion.li>
  )
}
