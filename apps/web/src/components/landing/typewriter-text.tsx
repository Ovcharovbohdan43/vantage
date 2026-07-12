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

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}

function renderMultiline(value: string, mapLine?: (line: string, index: number) => ReactNode) {
  const lines = value.split('\n')
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {mapLine ? mapLine(line, index) : line || '\u00A0'}
    </Fragment>
  ))
}

function shouldSkipAnimation() {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  // Narrow / low-power phones: character-by-character + background-clip reflows stutter.
  if (window.matchMedia('(max-width: 640px)').matches) return true
  return false
}

export function TypewriterText({
  text,
  accent,
  accentClassName = 'text-[#d0bcff]',
  duration = 2200,
  delay = 200,
  className,
  showCursor = true,
  energyGradient = false,
}: TypewriterTextProps) {
  // SSR + first paint: full text (avoids empty hero / hydration mismatch).
  // Desktop then replays the typewriter once after mount.
  const [visibleCount, setVisibleCount] = useState(text.length)
  const [done, setDone] = useState(true)
  const [animate, setAnimate] = useState(false)
  const rafRef = useRef(0)
  const countRef = useRef(text.length)

  useEffect(() => {
    if (shouldSkipAnimation()) {
      countRef.current = text.length
      setVisibleCount(text.length)
      setDone(true)
      setAnimate(false)
      return
    }

    setAnimate(true)
    countRef.current = 0
    setVisibleCount(0)
    setDone(false)
    const startedAt = performance.now() + delay

    const tick = (now: number) => {
      const elapsed = now - startedAt
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // Mild ease — cubic ease-out crawls on the last ~20% and feels "stuck".
      const progress = Math.min(elapsed / duration, 1)
      const nextCount = progress >= 1 ? text.length : Math.floor(easeOutQuad(progress) * text.length)

      if (nextCount !== countRef.current) {
        countRef.current = nextCount
        setVisibleCount(nextCount)
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        countRef.current = text.length
        setVisibleCount(text.length)
        setDone(true)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [text, duration, delay])

  const visible = text.slice(0, visibleCount)
  // Apply gradient only when complete on animated runs — mid-type background-clip
  // reflows leave blank/glitchy glyphs on some mobile browsers.
  const useGradient = energyGradient && (!animate || done)
  const textTone = useGradient ? 'landing-energy-text' : energyGradient ? 'text-[#e5e1e4]' : undefined
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

  const lineCount = text.split('\n').length

  return (
    <span
      className={cn('relative block w-full max-w-full text-balance', className)}
      style={{ minHeight: `${lineCount * 1.15}em` }}
    >
      {/* Width/height reserve without a second wrapping layer fighting the typed text */}
      <span className="invisible block whitespace-pre-line" aria-hidden>
        {renderContent(text)}
      </span>
      <span className="absolute inset-0 block whitespace-pre-line">
        <span className={textTone}>{renderContent(visible)}</span>
        {showCursor && animate && !done && (
          <span
            className={cn(
              'ml-0.5 inline-block h-[0.85em] w-[2px] align-baseline',
              energyGradient ? 'bg-[#ff5ec8]' : 'bg-[#d0bcff]',
              'animate-pulse',
            )}
            aria-hidden
          />
        )}
      </span>
    </span>
  )
}
