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
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">Competitors</p>
        {[1, 2, 3].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    )
  }

  if (competitors.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
        Competitors ({competitors.length})
      </p>
      <ul className="space-y-2">
        {competitors.map((competitor, index) => (
          <motion.li
            key={competitor.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start justify-between gap-3 rounded-lg border border-white/8 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#e5e1e4]">{competitor.name}</p>
              <p className="mt-0.5 text-xs text-[#958ea0]">
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
              className="shrink-0 text-[#958ea0] transition-colors hover:text-[#d0bcff]"
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
