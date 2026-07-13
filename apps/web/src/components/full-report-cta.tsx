'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowUpRight, Lock } from 'lucide-react'
import { PricingModal } from '@/components/pricing-modal'
import { unlockProject } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { CreditsBalance, ResearchDepth } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const DEPTH_OPTIONS: {
  id: ResearchDepth
  label: string
  competitors: number
  reviews: number
}[] = [
  { id: 'shallow', label: 'Shallow', competitors: 5, reviews: 50 },
  { id: 'standard', label: 'Standard', competitors: 10, reviews: 100 },
  { id: 'deep', label: 'Deep', competitors: 15, reviews: 200 },
]

function depthCost(credits: CreditsBalance, depth: ResearchDepth) {
  return credits.depth_credit_costs?.[depth] ?? (depth === 'shallow' ? 1 : depth === 'standard' ? 2 : 3)
}

function canAffordDepth(credits: CreditsBalance, depth: ResearchDepth) {
  return credits.total_credits >= depthCost(credits, depth)
}

interface FullReportCtaProps {
  projectId: string
  credits: CreditsBalance
}

export function FullReportCta({ projectId, credits }: FullReportCtaProps) {
  const [pricingOpen, setPricingOpen] = useState(false)
  const [depth, setDepth] = useState<ResearchDepth>('standard')
  const queryClient = useQueryClient()

  const cost = depthCost(credits, depth)
  const affordable = canAffordDepth(credits, depth)

  const unlockMutation = useMutation({
    mutationFn: () => unlockProject(projectId, depth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-report', projectId] })
      queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
      window.location.href = `/research/${projectId}`
    },
  })

  async function handleUnlock() {
    if (affordable) {
      unlockMutation.mutate()
    } else {
      setPricingOpen(true)
    }
  }

  const error =
    unlockMutation.error instanceof ApiError
      ? unlockMutation.error.message
      : unlockMutation.isError
        ? 'Could not unlock report'
        : null

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 rounded-xl border border-v-primary/30 bg-gradient-to-br from-v-surface-high via-v-surface to-v-surface-high p-6"
      >
        <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-start">
          <div className="min-w-0 max-w-xl">
            <p className="mb-2 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
              Worth building?
            </p>
            <h3 className="mb-2 text-base font-semibold text-v-on">
              Find out if your idea is worth the next 3 months
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-v-muted">
              Full report: user quotes, pain map with severity scores, opportunity direction, and a
              build / pivot / don&apos;t-build recommendation.
            </p>

            <p className="mb-2 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
              Choose depth
            </p>
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DEPTH_OPTIONS.map((option) => {
                const optionCost = depthCost(credits, option.id)
                const selected = depth === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDepth(option.id)}
                    className={cn(
                      'rounded-lg border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-v-primary/45 bg-v-primary/15'
                        : 'border-white/10 hover:border-v-primary/30',
                    )}
                  >
                    <div className="text-xs font-medium text-v-on">{option.label}</div>
                    <div className="mt-0.5 font-landing-mono text-[10px] text-v-muted">
                      {optionCost} cr · {option.competitors}×{option.reviews}
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p className="mt-2 text-sm text-v-error">{error}</p>}
          </div>
          <button
            type="button"
            onClick={handleUnlock}
            disabled={unlockMutation.isPending}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-v-on px-4 py-2.5 text-sm font-semibold text-v-bg transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
          >
            <Lock size={14} />
            {unlockMutation.isPending
              ? 'Starting full analysis…'
              : affordable
                ? `Use ${cost} credit${cost === 1 ? '' : 's'} — full report`
                : 'Get credits — from $9'}
            {!unlockMutation.isPending && <ArrowUpRight size={14} />}
          </button>
        </div>
      </motion.section>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} highlightPack="starter" />
    </>
  )
}
