'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { EnergyAnimation } from '@/components/energy-animation'
import { cn } from '@/lib/utils'
import { getAnalysisLoadingCopy, type LoadingContext } from '@/lib/analysis-messages'

interface AnalysisLoadingViewProps {
  stage?: LoadingContext
  progressPct?: number
  variant?: 'fullscreen' | 'inline'
  className?: string
}

export function AnalysisLoadingView({
  stage = 'initial',
  progressPct,
  variant = 'fullscreen',
  className,
}: AnalysisLoadingViewProps) {
  const copy = getAnalysisLoadingCopy(stage)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    setTipIndex(0)
  }, [stage])

  useEffect(() => {
    if (copy.tips.length <= 1) return
    const timer = setInterval(() => {
      setTipIndex((current) => (current + 1) % copy.tips.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [copy.tips.length, stage])

  const tip = copy.tips[tipIndex] ?? copy.tips[0]
  const isFullscreen = variant === 'fullscreen'

  return (
    <div
      className={cn(
        isFullscreen
          ? 'flex flex-col items-center justify-center min-h-[50vh] px-8 py-16'
          : 'border border-zinc-200 bg-zinc-950 p-8',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn('text-center', isFullscreen ? 'max-w-md' : 'max-w-lg mx-auto')}>
        <EnergyAnimation
          className={cn(
            'mx-auto mb-6 h-40 w-40 overflow-hidden rounded-full sm:h-48 sm:w-48',
            isFullscreen && 'bg-zinc-950',
          )}
        />

        <h2
          className={cn(
            'text-base font-semibold mb-3',
            isFullscreen ? 'text-zinc-950' : 'text-zinc-50',
          )}
        >
          {copy.title}
        </h2>

        <div className="min-h-[3rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${stage}-${tipIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'text-sm leading-relaxed',
                isFullscreen ? 'text-zinc-500' : 'text-zinc-400',
              )}
            >
              {tip}
            </motion.p>
          </AnimatePresence>
        </div>

        {typeof progressPct === 'number' && progressPct > 0 && (
          <div className="mt-6 max-w-xs mx-auto">
            <div
              className={cn(
                'h-1.5 overflow-hidden rounded-full',
                isFullscreen ? 'bg-zinc-200' : 'bg-white/10',
              )}
            >
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isFullscreen ? 'bg-blue-600' : 'bg-[#d0bcff]',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progressPct)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
