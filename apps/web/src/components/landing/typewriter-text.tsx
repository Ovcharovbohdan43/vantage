'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface TypewriterTextProps {
  text: string
  /** Phrase inside text to accent with color (no background) */
  accent?: string
  accentClassName?: string
  duration?: number
  delay?: number
  className?: string
  showCursor?: boolean
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function TypewriterText({
  text,
  accent,
  accentClassName = 'text-[#d0bcff]',
  duration = 2600,
  delay = 300,
  className,
  showCursor = true,
}: TypewriterTextProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [done, setDone] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setVisibleCount(text.length)
      setDone(true)
      return
    }

    setVisibleCount(0)
    setDone(false)
    const startedAt = performance.now() + delay

    const tick = (now: number) => {
      const elapsed = now - startedAt
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)
      const nextCount = Math.floor(eased * text.length)

      setVisibleCount(nextCount)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setVisibleCount(text.length)
        setDone(true)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [text, duration, delay])

  const visible = text.slice(0, visibleCount)

  function renderWithAccent(value: string) {
    if (!accent || !value.includes(accent.slice(0, Math.min(accent.length, value.length)))) {
      // Partial accent while typing through the accent phrase
      if (accent) {
        const idx = text.indexOf(accent)
        if (idx >= 0 && visibleCount > idx) {
          const before = value.slice(0, idx)
          const mid = value.slice(idx)
          const accentPart = mid.slice(0, Math.min(mid.length, accent.length))
          const after = mid.slice(accentPart.length)
          return (
            <>
              {before}
              <span className={accentClassName}>{accentPart}</span>
              {after}
            </>
          )
        }
      }
      return value
    }

    const idx = value.indexOf(accent)
    if (idx < 0) return value
    return (
      <>
        {value.slice(0, idx)}
        <span className={accentClassName}>{accent}</span>
        {value.slice(idx + accent.length)}
      </>
    )
  }

  return (
    <span className={cn('inline-grid', className)}>
      <span className="col-start-1 row-start-1 invisible" aria-hidden>
        {accent ? (
          <>
            {text.slice(0, text.indexOf(accent))}
            <span className={accentClassName}>{accent}</span>
            {text.slice(text.indexOf(accent) + accent.length)}
          </>
        ) : (
          text
        )}
      </span>
      <span className="col-start-1 row-start-1">
        {renderWithAccent(visible)}
        {showCursor && (
          <span
            className={cn(
              'ml-0.5 inline-block h-[0.85em] w-[2px] align-baseline bg-[#d0bcff]',
              done ? 'opacity-0 transition-opacity duration-500' : 'animate-pulse',
            )}
            aria-hidden
          />
        )}
      </span>
    </span>
  )
}
