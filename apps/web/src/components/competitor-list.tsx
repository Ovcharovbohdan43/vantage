'use client'

import { ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Competitor } from '@/lib/api/types'

interface CompetitorListProps {
  competitors: Competitor[]
  loading?: boolean
}

export function CompetitorList({ competitors, loading }: CompetitorListProps) {
  if (loading) {
    return (
      <div className="border border-zinc-200 p-5 space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">Competitors</p>
        {[1, 2, 3].map((row) => (
          <div key={row} className="h-12 bg-zinc-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (competitors.length === 0) {
    return null
  }

  return (
    <div className="border border-zinc-200 p-5">
      <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4">
        Competitors ({competitors.length})
      </p>
      <ul className="space-y-2">
        {competitors.map((competitor, index) => (
          <motion.li
            key={competitor.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start justify-between gap-3 border border-zinc-100 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-950 truncate">{competitor.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {competitor.source.toUpperCase()}
                {competitor.rating != null ? ` · ${competitor.rating.toFixed(1)}★` : ''}
                {competitor.reviews_count != null
                  ? ` · ${competitor.reviews_count.toLocaleString()} reviews`
                  : ''}
              </p>
            </div>
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-zinc-400 hover:text-blue-600 transition-colors"
              aria-label={`Open ${competitor.name} on ${competitor.source}`}
            >
              <ExternalLink size={16} />
            </a>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
