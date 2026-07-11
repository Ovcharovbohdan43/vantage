'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface EnergyAnimationProps {
  className?: string
  /** Extra glow behind the particles */
  glowClassName?: string
}

function VideoSources() {
  return (
    <>
      <source src="/animations/analysis-loader.webm?v=2" type="video/webm" />
      <source src="/animations/analysis-loader.mp4?v=2" type="video/mp4" />
    </>
  )
}

export function EnergyAnimation({ className, glowClassName }: EnergyAnimationProps) {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        // Soft radial crop hides any residual video rectangle at large sizes
        '[mask-image:radial-gradient(circle_closest-side_at_center,black_52%,transparent_78%)]',
        '[-webkit-mask-image:radial-gradient(circle_closest-side_at_center,black_52%,transparent_78%)]',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-[22%] rounded-full bg-[#d0bcff]/18 blur-3xl',
          glowClassName,
        )}
      />

      <video
        className="relative h-full w-full object-contain mix-blend-screen"
        autoPlay={!reduceMotion}
        loop={!reduceMotion}
        muted
        playsInline
        preload={reduceMotion ? 'metadata' : 'auto'}
        aria-hidden
      >
        <VideoSources />
      </video>
    </div>
  )
}
