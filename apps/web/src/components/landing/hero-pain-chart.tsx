'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const CX = 280
const CY = 210
const RX = 150
const RY = 72
const DEPTH = 48

type Wedge = {
  start: number
  end: number
  explode?: number
  top: string
}

const WEDGES: Wedge[] = [
  { start: -20, end: 35, explode: 38, top: '#c4a8ff' },
  { start: 35, end: 95, top: '#d0bcff' },
  { start: 95, end: 145, top: '#b794ff' },
  { start: 145, end: 200, top: '#a078ff' },
  { start: 200, end: 255, top: '#c4a8ff' },
  { start: 255, end: 310, top: '#d8c8ff' },
  { start: 310, end: 340, top: '#b794ff' },
]

/** Stable rounding — avoids SSR/client float drift in path `d` */
function f(n: number) {
  return Math.round(n * 100) / 100
}

function rad(deg: number) {
  return (deg * Math.PI) / 180
}

function ellipsePoint(deg: number, rx = RX, ry = RY, ox = 0, oy = 0) {
  const a = rad(deg)
  return {
    x: f(CX + ox + rx * Math.cos(a)),
    y: f(CY + oy + ry * Math.sin(a)),
  }
}

function wedgeOffset(start: number, end: number, explode = 0) {
  if (!explode) return { ox: 0, oy: 0 }
  const mid = (start + end) / 2
  const a = rad(mid)
  return { ox: f(Math.cos(a) * explode), oy: f(Math.sin(a) * explode * 0.55) }
}

function sideFaces(w: Wedge) {
  const { ox, oy } = wedgeOffset(w.start, w.end, w.explode)
  const faces: { d: string; fill: string }[] = []
  for (const ang of [w.start, w.end]) {
    const top = ellipsePoint(ang, RX, RY, ox, oy)
    if (Math.sin(rad(ang)) > -0.15 || w.explode) {
      const nextAng = ang === w.start ? ang + 2 : ang - 2
      const top2 = ellipsePoint(nextAng, RX, RY, ox, oy)
      faces.push({
        d: `M${top.x} ${top.y} L${top2.x} ${top2.y} L${top2.x} ${f(top2.y + DEPTH)} L${top.x} ${f(top.y + DEPTH)} Z`,
        fill: Math.cos(rad(ang)) > 0 ? '#f4f4f5' : '#e8e8ea',
      })
    }
  }
  for (let i = 0; i < 10; i++) {
    const a0 = w.start + ((w.end - w.start) * i) / 10
    const a1 = w.start + ((w.end - w.start) * (i + 1)) / 10
    const mid = (a0 + a1) / 2
    if (Math.sin(rad(mid)) < 0.05 && !w.explode) continue
    const t0 = ellipsePoint(a0, RX, RY, ox, oy)
    const t1 = ellipsePoint(a1, RX, RY, ox, oy)
    faces.push({
      d: `M${t0.x} ${t0.y} L${t1.x} ${t1.y} L${t1.x} ${f(t1.y + DEPTH)} L${t0.x} ${f(t0.y + DEPTH)} Z`,
      fill: Math.cos(rad(mid)) > 0.2 ? '#fafafa' : '#ececee',
    })
  }
  return faces
}

function topPath(w: Wedge) {
  const { ox, oy } = wedgeOffset(w.start, w.end, w.explode)
  const c = { x: f(CX + ox * 0.25), y: f(CY + oy * 0.25) }
  const s = ellipsePoint(w.start, RX, RY, ox, oy)
  const steps = Math.max(10, Math.ceil(Math.abs(w.end - w.start) / 5))
  let d = `M${c.x} ${c.y} L${s.x} ${s.y}`
  for (let i = 1; i <= steps; i++) {
    const t = w.start + ((w.end - w.start) * i) / steps
    const p = ellipsePoint(t, RX, RY, ox, oy)
    d += ` L${p.x} ${p.y}`
  }
  return `${d} Z`
}

function innerWall(w: Wedge) {
  if (!w.explode) return null
  const { ox, oy } = wedgeOffset(w.start, w.end, w.explode)
  const cTop = { x: f(CX + ox * 0.25), y: f(CY + oy * 0.25) }
  const cBot = { x: cTop.x, y: f(cTop.y + DEPTH) }
  const a = ellipsePoint(w.start, RX, RY, ox, oy)
  const b = ellipsePoint(w.end, RX, RY, ox, oy)
  return [
    `M${cTop.x} ${cTop.y} L${a.x} ${a.y} L${a.x} ${f(a.y + DEPTH)} L${cBot.x} ${cBot.y} Z`,
    `M${cTop.x} ${cTop.y} L${b.x} ${b.y} L${b.x} ${f(b.y + DEPTH)} L${cBot.x} ${cBot.y} Z`,
  ]
}

const GEOMETRY = [...WEDGES]
  .sort((a, b) => {
    const ma = Math.sin(rad((a.start + a.end) / 2))
    const mb = Math.sin(rad((b.start + b.end) / 2))
    return ma - mb
  })
  .map((w) => ({
    key: `${w.start}-${w.end}`,
    top: w.top,
    sides: sideFaces(w),
    walls: innerWall(w),
    topPath: topPath(w),
  }))

export function HeroPainChart() {
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR + first client paint: both "hidden" → no mismatch.
  // After mount: animate to "show" (skipped if reduced motion).
  const phase = !mounted ? 'hidden' : reduce ? 'show' : 'show'
  const startFromHidden = mounted && !reduce

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: startFromHidden ? 0.07 : 0,
        delayChildren: startFromHidden ? 0.15 : 0,
      },
    },
  }

  const grow = {
    hidden: { opacity: 0, scale: 0.15, y: 50 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: startFromHidden
        ? { type: 'spring' as const, stiffness: 130, damping: 16, mass: 0.75 }
        : { duration: 0 },
    },
  }

  const draw = {
    hidden: { opacity: 0, pathLength: 0 },
    show: {
      opacity: 1,
      pathLength: 1,
      transition: startFromHidden
        ? { duration: 0.55, ease: 'easeOut' as const, delay: 0.65 }
        : { duration: 0 },
    },
  }

  const fade = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: startFromHidden ? { delay: 0.95, duration: 0.35 } : { duration: 0 },
    },
  }

  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden>
      <motion.svg
        viewBox="0 0 560 420"
        className="h-auto w-full overflow-visible"
        variants={container}
        initial="hidden"
        animate={phase}
      >
        <defs>
          <linearGradient id="pieGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0bcff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d0bcff" stopOpacity="0" />
          </linearGradient>
          <filter id="chartShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>

        <motion.ellipse
          cx={CX}
          cy={CY + DEPTH + 36}
          rx={RX + 20}
          ry={28}
          fill="url(#pieGlow)"
          variants={grow}
        />

        <motion.g
          variants={grow}
          filter="url(#chartShadow)"
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
          {GEOMETRY.map((g) => (
            <g key={g.key}>
              {g.sides.map((face, i) => (
                <path key={i} d={face.d} fill={face.fill} stroke="#111" strokeWidth="0.8" />
              ))}
              {g.walls?.map((d, i) => (
                <path key={`iw-${i}`} d={d} fill="#2a2a2c" stroke="#111" strokeWidth="0.8" />
              ))}
              <path d={g.topPath} fill={g.top} stroke="#111" strokeWidth="1.1" />
            </g>
          ))}
        </motion.g>

        <motion.path
          d="M160 150 L95 95"
          fill="none"
          stroke="#e5e1e4"
          strokeWidth="1.4"
          strokeLinecap="round"
          variants={draw}
        />
        <motion.path
          d="M400 130 L470 80"
          fill="none"
          stroke="#e5e1e4"
          strokeWidth="1.4"
          strokeLinecap="round"
          variants={draw}
        />
        <motion.path
          d="M155 300 L85 350"
          fill="none"
          stroke="#e5e1e4"
          strokeWidth="1.4"
          strokeLinecap="round"
          variants={draw}
        />
        <motion.path
          d="M455 250 L520 290"
          fill="none"
          stroke="#e5e1e4"
          strokeWidth="1.4"
          strokeLinecap="round"
          variants={draw}
        />

        <motion.g variants={fade}>
          <rect x="52" y="72" width="42" height="9" rx="1.5" fill="#e5e1e4" />
          <rect x="52" y="86" width="30" height="7" rx="1.5" fill="#e5e1e4" opacity="0.4" />
        </motion.g>
        <motion.g variants={fade}>
          <rect x="458" y="58" width="42" height="9" rx="1.5" fill="#e5e1e4" />
          <rect x="458" y="72" width="28" height="7" rx="1.5" fill="#e5e1e4" opacity="0.4" />
        </motion.g>
        <motion.g variants={fade}>
          <rect x="42" y="345" width="42" height="9" rx="1.5" fill="#e5e1e4" />
          <rect x="42" y="359" width="34" height="7" rx="1.5" fill="#e5e1e4" opacity="0.4" />
          <rect x="42" y="371" width="24" height="7" rx="1.5" fill="#e5e1e4" opacity="0.25" />
        </motion.g>
        <motion.g variants={fade}>
          <rect x="508" y="285" width="26" height="22" rx="2" fill="none" stroke="#e5e1e4" strokeWidth="1.3" />
          <rect x="513" y="291" width="16" height="3.5" rx="0.5" fill="#e5e1e4" opacity="0.75" />
          <rect x="513" y="298" width="12" height="3.5" rx="0.5" fill="#e5e1e4" opacity="0.4" />
        </motion.g>
      </motion.svg>
    </div>
  )
}
