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
              'flex items-center gap-3 text-sm border px-3 py-2.5 transition-colors',
              isActive && 'border-zinc-950 bg-zinc-50',
              isDone && 'border-zinc-200 text-zinc-500',
              isPending && 'border-zinc-100 text-zinc-400',
              failed && stage === currentStage && 'border-red-200 bg-red-50 text-red-900',
            )}
          >
            <span
              className={cn(
                'w-6 h-6 flex items-center justify-center text-xs font-mono shrink-0 border',
                isActive && 'border-zinc-950 bg-zinc-950 text-white',
                isDone && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                isPending && 'border-zinc-200 text-zinc-400',
              )}
            >
              {isDone ? '✓' : idx}
            </span>
            <span className={cn(isActive && 'font-medium text-zinc-950')}>{STAGE_LABELS[stage]}</span>
            {isActive && (
              <span className="ml-auto text-xs text-blue-600">In progress</span>
            )}
          </motion.li>
        )
      })}
    </ol>
  )
}
