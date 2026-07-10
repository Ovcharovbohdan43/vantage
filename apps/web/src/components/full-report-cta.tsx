'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowUpRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PricingModal } from '@/components/pricing-modal'
import { unlockProject } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { CreditsBalance, ResearchDepth } from '@/lib/api/types'

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
        className="border border-zinc-200 bg-zinc-950 text-white p-6 mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-start justify-between gap-4">
          <div className="max-w-xl min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">
              Worth building?
            </p>
            <h3 className="text-base font-semibold mb-2">
              Find out if your idea is worth the next 3 months
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              Full report: user quotes, pain map with severity scores, opportunity direction,
              and a build / pivot / don&apos;t-build recommendation.
            </p>

            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Choose depth
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              {DEPTH_OPTIONS.map((option) => {
                const optionCost = depthCost(credits, option.id)
                const selected = depth === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDepth(option.id)}
                    className={`text-left p-2.5 border transition-colors ${
                      selected
                        ? 'border-white bg-white/10'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <div className="text-xs font-medium">{option.label}</div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      {optionCost} cr · {option.competitors}×{option.reviews}
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p className="text-sm text-red-300 mt-2">{error}</p>}
          </div>
          <Button
            onClick={handleUnlock}
            disabled={unlockMutation.isPending}
            className="gap-1.5 w-full sm:w-auto shrink-0 bg-white text-zinc-950 hover:bg-zinc-100"
          >
            <Lock size={14} />
            {unlockMutation.isPending
              ? 'Starting full analysis…'
              : affordable
                ? `Use ${cost} credit${cost === 1 ? '' : 's'} — full report`
                : 'Get credits — from $9'}
            {!unlockMutation.isPending && <ArrowUpRight size={14} />}
          </Button>
        </div>
      </motion.section>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} highlightPack="starter" />
    </>
  )
}
