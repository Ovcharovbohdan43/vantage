'use client'

import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react'
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
  /** Animated gradient matching the hero energy animation */
  energyGradient?: boolean
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function renderMultiline(value: string, mapLine?: (line: string, index: number) => ReactNode) {
  const lines = value.split('\n')
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {mapLine ? mapLine(line, index) : line}
    </Fragment>
  ))
}

export function TypewriterText({
  text,
  accent,
  accentClassName = 'text-[#d0bcff]',
  duration = 2600,
  delay = 300,
  className,
  showCursor = true,
  energyGradient = false,
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
  const textTone = energyGradient ? 'landing-energy-text' : undefined
  const resolvedAccentClass = energyGradient ? undefined : accentClassName

  function accentize(value: string) {
    if (energyGradient || !accent) return value

    const idx = value.indexOf(accent)
    if (idx < 0) {
      const fullIdx = text.indexOf(accent)
      if (fullIdx >= 0 && visibleCount > fullIdx) {
        const before = value.slice(0, fullIdx)
        const mid = value.slice(fullIdx)
        const accentPart = mid.slice(0, Math.min(mid.length, accent.length))
        const after = mid.slice(accentPart.length)
        return (
          <>
            {before}
            <span className={resolvedAccentClass}>{accentPart}</span>
            {after}
          </>
        )
      }
      return value
    }

    return (
      <>
        {value.slice(0, idx)}
        <span className={resolvedAccentClass}>{accent}</span>
        {value.slice(idx + accent.length)}
      </>
    )
  }

  function renderContent(value: string) {
    return renderMultiline(value, (line) => accentize(line))
  }

  return (
    <span className={cn('inline-grid', className)}>
      <span className={cn('col-start-1 row-start-1 invisible', textTone)} aria-hidden>
        {renderContent(text)}
      </span>
      <span className="col-start-1 row-start-1">
        <span className={textTone}>{renderContent(visible)}</span>
        {showCursor && (
          <span
            className={cn(
              'ml-0.5 inline-block h-[0.85em] w-[2px] align-baseline',
              energyGradient ? 'bg-[#ff5ec8]' : 'bg-[#d0bcff]',
              done ? 'opacity-0 transition-opacity duration-500' : 'animate-pulse',
            )}
            aria-hidden
          />
        )}
      </span>
    </span>
  )
}
