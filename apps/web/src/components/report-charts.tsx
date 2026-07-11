'use client'

import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { ReportCompetitor, ReportPainCluster } from '@/lib/api/types'

const COLORS = {
  market: '#d0bcff',
  risk: '#ff4ec8',
  severity: '#ff8adf',
  emotion: '#d0bcff',
  opportunity: '#a78bfa',
  frequency: '#ff4ec8',
  rating: '#d0bcff',
  reviews: '#ff8adf',
  grid: 'rgba(255,255,255,0.08)',
  muted: '#958ea0',
} as const

function truncate(text: string, max = 28): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-[#958ea0]">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

interface TooltipPayloadItem {
  name?: string
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-white/12 bg-[#201f22] px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1.5 max-w-[220px] font-medium text-[#e5e1e4]">{label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={`${entry.name}-${entry.value}`} className="flex items-center gap-2 text-[#cbc3d7]">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? COLORS.muted }}
            />
            <span>{entry.name}:</span>
            <span className="font-medium tabular-nums text-[#e5e1e4]">
              {typeof entry.value === 'number'
                ? Number.isInteger(entry.value)
                  ? entry.value.toLocaleString()
                  : entry.value.toFixed(1)
                : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const axisTick = { fill: COLORS.muted, fontSize: 11, fontFamily: 'var(--font-mono)' }

export function MarketRiskGaugeChart({
  marketScore,
  riskScore,
}: {
  marketScore: number
  riskScore: number
}) {
  const data = [
    { name: 'Market', score: Math.round(marketScore), fill: COLORS.market },
    { name: 'Risk', score: Math.round(riskScore), fill: COLORS.risk },
  ]

  return (
    <ChartCard
      title="Market vs risk"
      subtitle="Opportunity strength compared to competitive pressure"
    >
      <div className="grid grid-cols-2 gap-4">
        {data.map((item) => (
          <div key={item.name} className="flex flex-col items-center">
            <div className="relative w-full h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="100%"
                  barSize={10}
                  data={[{ name: item.name, value: item.score, fill: item.fill }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={6}
                    background={{ fill: 'rgba(255,255,255,0.06)' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-semibold tabular-nums text-[#e5e1e4]">{item.score}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#958ea0]">/ 100</span>
              </div>
            </div>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-[#958ea0]">{item.name}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

export function PainFrequencyChart({ clusters }: { clusters: ReportPainCluster[] }) {
  const data = [...clusters]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8)
    .map((c) => ({
      name: truncate(c.title, 32),
      fullName: c.title,
      frequency: c.frequency,
    }))
    .reverse()

  if (data.length === 0) return null

  const height = Math.max(180, data.length * 36)

  return (
    <ChartCard title="Pain frequency" subtitle="How often each theme appears in reviews">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              const fullName = payload?.[0]?.payload?.fullName as string | undefined
              return (
                <ChartTooltip
                  active={active}
                  label={fullName ?? (label != null ? String(label) : undefined)}
                  payload={payload?.map((p) => ({
                    name: 'Mentions',
                    value: p.value as number,
                    color: COLORS.frequency,
                  }))}
                />
              )
            }}
          />
          <Bar dataKey="frequency" fill={COLORS.frequency} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function PainScoresChart({ clusters }: { clusters: ReportPainCluster[] }) {
  const data = [...clusters]
    .sort((a, b) => (b.commercial_opportunity ?? 0) - (a.commercial_opportunity ?? 0))
    .slice(0, 6)
    .map((c) => ({
      name: truncate(c.title, 18),
      fullName: c.title,
      severity: c.severity_score ?? 0,
      emotion: c.emotional_intensity ?? 0,
      opportunity: c.commercial_opportunity ?? 0,
    }))

  if (data.length === 0) return null

  return (
    <ChartCard
      title="Cluster scores"
      subtitle="Severity, emotional intensity and commercial opportunity (1–10)"
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
          <YAxis domain={[0, 10]} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                label={(payload?.[0]?.payload?.fullName as string) ?? label}
                payload={payload?.map((p) => ({
                  name: p.name as string,
                  value: p.value as number,
                  color: p.color,
                }))}
              />
            )}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              color: '#958ea0',
            }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="severity" name="Severity" fill={COLORS.severity} radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="emotion" name="Emotion" fill={COLORS.emotion} radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar
            dataKey="opportunity"
            name="Opportunity"
            fill={COLORS.opportunity}
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function OpportunityMapChart({ clusters }: { clusters: ReportPainCluster[] }) {
  const data = clusters
    .filter((c) => c.severity_score != null && c.commercial_opportunity != null)
    .map((c) => ({
      name: c.title,
      severity: c.severity_score as number,
      opportunity: c.commercial_opportunity as number,
      frequency: c.frequency,
      z: Math.max(40, Math.min(400, c.frequency / 2)),
    }))

  if (data.length === 0) return null

  return (
    <ChartCard
      title="Opportunity map"
      subtitle="Top-right = high severity + high commercial upside (bubble size = mentions)"
      className="sm:col-span-2"
    >
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            type="number"
            dataKey="severity"
            name="Severity"
            domain={[0, 10]}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Severity', position: 'insideBottom', offset: -4, fill: COLORS.muted, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="opportunity"
            name="Opportunity"
            domain={[0, 10]}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Opportunity',
              angle: -90,
              position: 'insideLeft',
              fill: COLORS.muted,
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 400]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as (typeof data)[number]
              return (
                <ChartTooltip
                  active
                  label={point.name}
                  payload={[
                    { name: 'Severity', value: point.severity, color: COLORS.severity },
                    { name: 'Opportunity', value: point.opportunity, color: COLORS.opportunity },
                    { name: 'Mentions', value: point.frequency, color: COLORS.frequency },
                  ]}
                />
              )
            }}
          />
          <Scatter data={data} fill={COLORS.opportunity} fillOpacity={0.75}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.opportunity >= 7 && entry.severity >= 7
                    ? COLORS.market
                    : entry.opportunity >= 5
                      ? COLORS.opportunity
                      : COLORS.muted
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CompetitorLandscapeChart({ competitors }: { competitors: ReportCompetitor[] }) {
  const withData = competitors.filter((c) => c.rating != null || c.reviews_count != null)
  if (withData.length === 0) return null

  const maxReviews = Math.max(...withData.map((c) => c.reviews_count ?? 0), 1)

  const data = [...withData]
    .sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0))
    .slice(0, 10)
    .map((c) => ({
      name: truncate(c.name, 22),
      fullName: c.name,
      rating: c.rating ?? 0,
      reviewsPct: Math.round(((c.reviews_count ?? 0) / maxReviews) * 100),
      reviewsCount: c.reviews_count ?? 0,
      source: c.source.toUpperCase(),
    }))
    .reverse()

  const height = Math.max(200, data.length * 34)

  return (
    <ChartCard
      title="Competitive landscape"
      subtitle="Star rating and relative review volume among tracked players"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 5]} tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as (typeof data)[number]
              return (
                <ChartTooltip
                  active
                  label={point.fullName}
                  payload={[
                    { name: 'Rating', value: `${point.rating.toFixed(1)} ★`, color: COLORS.rating },
                    { name: 'Reviews', value: point.reviewsCount, color: COLORS.reviews },
                    { name: 'Source', value: point.source, color: COLORS.muted },
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="rating" name="Rating" fill={COLORS.rating} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-3 font-mono text-[10px] text-[#958ea0]">
        Bar length = star rating (0–5). Hover for full review counts.
      </p>
    </ChartCard>
  )
}

export function CompetitorReviewsChart({ competitors }: { competitors: ReportCompetitor[] }) {
  const bySource = competitors.reduce<Record<string, number>>((acc, c) => {
    const key = c.source.toUpperCase()
    acc[key] = (acc[key] ?? 0) + (c.reviews_count ?? 0)
    return acc
  }, {})

  const data = Object.entries(bySource).map(([source, reviews]) => ({
    source,
    reviews,
  }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Review sources" subtitle="Total reviews collected per platform">
      <ResponsiveContainer width="100%" height={data.length > 1 ? 140 : 100}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="source" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                label={label != null ? String(label) : undefined}
                payload={payload?.map((p) => ({
                  name: 'Reviews',
                  value: p.value as number,
                  color: COLORS.reviews,
                }))}
              />
            )}
          />
          <Bar dataKey="reviews" fill={COLORS.reviews} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ReportScoreCharts({
  marketScore,
  riskScore,
}: {
  marketScore: number
  riskScore: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="mb-6"
    >
      <MarketRiskGaugeChart marketScore={marketScore} riskScore={riskScore} />
    </motion.div>
  )
}

export function ReportPainCharts({ clusters }: { clusters: ReportPainCluster[] }) {
  if (clusters.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.14 }}
      className="mb-8"
    >
      <h2 className="mb-4 font-mono text-sm uppercase tracking-widest text-[#958ea0]">Pain landscape</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PainFrequencyChart clusters={clusters} />
        <PainScoresChart clusters={clusters} />
        <OpportunityMapChart clusters={clusters} />
      </div>
    </motion.section>
  )
}

export function ReportCompetitorCharts({ competitors }: { competitors: ReportCompetitor[] }) {
  if (competitors.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.18 }}
      className="mb-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CompetitorLandscapeChart competitors={competitors} />
        </div>
        <CompetitorReviewsChart competitors={competitors} />
      </div>
    </motion.section>
  )
}
