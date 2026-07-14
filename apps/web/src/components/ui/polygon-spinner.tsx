'use client'

/**
 * Morphing polygon loader (Neil Pullman / polygon-spinner), ported to GSAP 3.
 * Use for data-fetch waits — dashboard open, analysis start, shell loads.
 *
 * Drawn with headroom so stroke / rotation never clip into a hard square.
 */
import { useEffect, useId, useRef } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

type PolygonSpinnerProps = {
  size?: number
  className?: string
  /** When true, fade out at end of the current cycle */
  finishing?: boolean
  label?: string
}

type PointDict = Record<string, number>

function fillPoints(points: PointDict, sides: number, maxSides: number): PointDict {
  const next = { ...points }
  const x = next[`x${sides - 1}`]
  const y = next[`y${sides - 1}`]
  for (let i = sides; i < maxSides; i += 1) {
    next[`x${i}`] = x
    next[`y${i}`] = y
  }
  return next
}

function setSides(center: number, radius: number, sides: number, maxSides: number): PointDict {
  const points: PointDict = {}
  const angle = (2 * Math.PI) / sides
  let i = 0
  for (; i < sides; i += 1) {
    const a = i * angle
    const r = center + radius
    points[`x${i}`] = Math.floor(r * Math.sin(a))
    points[`y${i}`] = Math.floor(r * Math.cos(a))
  }
  return fillPoints(points, i, maxSides)
}

export function PolygonSpinner({
  size = 64,
  className,
  finishing = false,
  label = 'Loading',
}: PolygonSpinnerProps) {
  const reactId = useId()
  const polygonId = `polygon-${reactId.replace(/:/g, '')}`
  const svgRef = useRef<SVGSVGElement>(null)
  const polygonRef = useRef<SVGPolygonElement>(null)
  const finishingRef = useRef(finishing)
  const directionRef = useRef(false)

  useEffect(() => {
    finishingRef.current = finishing
  }, [finishing])

  useEffect(() => {
    const svg = svgRef.current
    const polygon = polygonRef.current
    if (!svg || !polygon) return

    const timing = 0.3
    const maxSides = 12
    // Keep drawn radius well under the box so stroke + rotation stay visible.
    const draw = size * 0.72
    const center = draw / 6
    const radius = center
    const sides = 1
    const s = draw / 100

    const points: PointDict = fillPoints(
      {
        x0: 0,
        y0: 60 * s,
        x1: 51 * s,
        y1: -31 * s,
        x2: -52 * s,
        y2: -32 * s,
        x3: -52 * s,
        y3: -32 * s,
      },
      sides,
      maxSides,
    )

    const paint = (target: PointDict, sideCount: number) => {
      const pts: string[] = []
      for (let j = 0; j <= sideCount; j += 1) {
        pts.push(`${target[`x${j}`]},${target[`y${j}`]}`)
      }
      polygon.setAttribute('points', pts.join(' '))
    }

    paint(points, sides)

    gsap.set(polygon, {
      transformOrigin: 'center center',
      x: size / 2,
      y: size / 2,
      rotation: 0,
    })
    gsap.set(svg, { scale: 1, opacity: 1, transformOrigin: 'center center' })

    const startRepeat = () => {
      if (directionRef.current) {
        gsap.to(polygon, {
          duration: timing * maxSides * 1.05,
          rotation: 10,
          ease: 'power2.inOut',
        })
      } else {
        gsap.to(polygon, {
          duration: timing * maxSides,
          rotation: 370,
          ease: 'power2.inOut',
        })
      }
      directionRef.current = !directionRef.current
    }

    const timeline = gsap.timeline({
      paused: true,
      yoyo: true,
      repeat: -1,
      onStart: startRepeat,
      onRepeat: startRepeat,
    })

    for (let i = sides - 1; i < maxSides; i += 1) {
      const finish = setSides(center, radius, i + 1, maxSides)
      const sideCount = i
      timeline.to(points, {
        ...finish,
        duration: timing,
        ease: 'power2.out',
        onUpdate() {
          paint(points, sideCount)
        },
      })
    }

    timeline.call(() => {
      if (!finishingRef.current) return
      timeline.pause()
      gsap.to(svg, {
        duration: 0.4,
        keyframes: [
          { scale: 1.05, opacity: 1 },
          { scale: 0.85, opacity: 0.5 },
          { scale: 0.35, opacity: 0.1 },
          { scale: 0, opacity: 0 },
        ],
      })
    })

    timeline.play()

    return () => {
      timeline.kill()
      gsap.killTweensOf(polygon)
      gsap.killTweensOf(svg)
    }
  }, [size])

  const strokeWidth = size >= 64 ? 2 : size >= 40 ? 1.75 : 1.5

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-visible text-v-on',
        className,
      )}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <svg
        ref={svgRef}
        className="block overflow-visible"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        overflow="visible"
        aria-hidden
      >
        <polygon
          ref={polygonRef}
          id={polygonId}
          className="fill-transparent stroke-current"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}
