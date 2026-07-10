'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
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
          : 'border border-zinc-200 bg-zinc-50/80 p-8',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn('text-center', isFullscreen ? 'max-w-md' : 'max-w-lg mx-auto')}>
        <div className="relative w-12 h-12 mx-auto mb-6">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-zinc-200"
            aria-hidden
          />
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            aria-hidden
          />
          <motion.span
            className="absolute inset-2 rounded-full bg-blue-600/10"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        </div>

        <h2 className="text-base font-semibold text-zinc-950 mb-3">{copy.title}</h2>

        <div className="min-h-[3rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${stage}-${tipIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-zinc-500 leading-relaxed"
            >
              {tip}
            </motion.p>
          </AnimatePresence>
        </div>

        {typeof progressPct === 'number' && progressPct > 0 && (
          <div className="mt-6 max-w-xs mx-auto">
            <div className="h-1.5 bg-zinc-200 overflow-hidden rounded-full">
              <motion.div
                className="h-full bg-blue-600 rounded-full"
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
