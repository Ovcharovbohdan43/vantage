'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ResearchStage } from '@/lib/api/types'
import { STAGE_LABELS } from '@/lib/api/types'

const PIPELINE_STAGES: ResearchStage[] = [
  'queued',
  'finding_competitors',
  'collecting_reviews',
  'analyzing',
  'generating_report',
  'completed',
]

interface StageStepperProps {
  currentStage: ResearchStage
  failed?: boolean
}

function stageIndex(stage: ResearchStage): number {
  if (stage === 'failed') return -1
  const idx = PIPELINE_STAGES.indexOf(stage)
  return idx === -1 ? 0 : idx
}

export function StageStepper({ currentStage, failed }: StageStepperProps) {
  const currentIdx = stageIndex(currentStage)

  return (
    <ol className="space-y-3">
      {PIPELINE_STAGES.filter((s) => s !== 'queued' && s !== 'cancelled').map((stage, i) => {
        const idx = i + 1
        const isActive = !failed && currentIdx === idx
        const isDone = !failed && currentIdx > idx
        const isPending = !failed && currentIdx < idx

        return (
          <motion.li
            key={stage}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
              isActive && 'border-[#d0bcff]/40 bg-[#d0bcff]/10',
              isDone && 'border-white/10 text-[#cbc3d7]',
              isPending && 'border-white/8 text-[#958ea0]',
              failed && 'border-[#ffb4ab]/25 bg-[#ffb4ab]/8 text-[#ffb4ab]',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs',
                isActive && 'border-[#d0bcff] bg-[#d0bcff] text-[#3c0091]',
                isDone && 'border-[#4edea3]/30 bg-[#4edea3]/10 text-[#4edea3]',
                isPending && 'border-white/15 text-[#958ea0]',
              )}
            >
              {isDone ? '✓' : idx}
            </span>
            <span className={cn(isActive && 'font-medium text-[#e5e1e4]')}>
              {STAGE_LABELS[stage]}
            </span>
            {isActive && (
              <span className="ml-auto font-mono text-xs text-[#ff8adf]">In progress</span>
            )}
          </motion.li>
        )
      })}
    </ol>
  )
}
