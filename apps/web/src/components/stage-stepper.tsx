'use client'

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
    <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {PIPELINE_STAGES.filter((s) => s !== 'queued' && s !== 'cancelled').map((stage, i) => {
        const idx = i + 1
        const isActive = !failed && currentIdx === idx
        const isDone = !failed && currentIdx > idx
        const isPending = !failed && currentIdx < idx

        return (
          <li
            key={stage}
            className={cn(
              'flex items-center gap-3 px-1 py-2.5 text-sm transition-colors',
              isActive && 'text-v-on',
              isDone && 'text-v-muted',
              isPending && 'text-v-muted/70',
              failed && 'text-v-error',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-landing-mono text-xs',
                isActive && 'border-v-primary bg-v-primary text-v-bg',
                isDone && 'border-v-tertiary/30 bg-v-tertiary/10 text-v-tertiary',
                isPending && 'border-white/15 text-v-muted',
                failed && 'border-v-error/30 bg-v-error/10 text-v-error',
              )}
            >
              {isDone ? '✓' : idx}
            </span>
            <span className={cn(isActive && 'font-medium')}>{STAGE_LABELS[stage]}</span>
            {isActive && (
              <span className="ml-auto font-landing-mono text-xs text-v-primary">In progress</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
