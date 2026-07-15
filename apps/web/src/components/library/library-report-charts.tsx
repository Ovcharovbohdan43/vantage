'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LibraryCompetitor, LibraryPainPoint } from '@/lib/api/library'

const CHART = {
  primary: '#e8ff47',
  teal: '#5eead4',
  danger: '#f07178',
  warning: '#f5a524',
  info: '#7dd3fc',
  grid: 'rgba(255,255,255,0.08)',
  muted: '#a1a1aa',
  surface: '#161616',
  text: '#f4f4f5',
} as const

const axisTick = {
  fill: CHART.muted,
  fontSize: 10,
  fontFamily: 'var(--font-landing-mono)',
}

const tooltipStyle = {
  background: CHART.surface,
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: CHART.text,
  fontSize: 12,
}

function shortLabel(value: string, max = 24) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function ChartFrame({
  title,
  description,
  children,
  table,
}: {
  title: string
  description: string
  children: React.ReactNode
  table: React.ReactNode
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-v-surface">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h3 className="text-sm font-semibold text-v-on">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-v-muted">{description}</p>
      </div>
      <div className="px-2 py-4 sm:px-4">{children}</div>
      <details className="border-t border-white/[0.06] px-4 py-2.5 text-xs">
        <summary className="cursor-pointer select-none font-landing-mono uppercase tracking-wider text-v-muted hover:text-v-on">
          View chart data
        </summary>
        <div className="mt-3 overflow-x-auto">{table}</div>
      </details>
    </section>
  )
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<Array<string | number>>
}) {
  return (
    <table className="w-full min-w-[360px] text-left">
      <thead>
        <tr className="border-b border-white/[0.08]">
          {headers.map((header) => (
            <th
              key={header}
              className="pb-2 pr-4 font-landing-mono text-[10px] font-medium uppercase tracking-wider text-v-muted"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-white/[0.05] last:border-0">
            {row.map((value, cellIndex) => (
              <td
                key={`${rowIndex}-${cellIndex}`}
                className="py-2 pr-4 tabular-nums text-v-on"
              >
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PainMentionsChart({ painPoints }: { painPoints: LibraryPainPoint[] }) {
  const data = [...painPoints]
    .sort(
      (a, b) =>
        (b.mention_count ?? b.frequency) - (a.mention_count ?? a.frequency),
    )
    .slice(0, 8)
    .map((pain) => ({
      name: shortLabel(pain.title, 25),
      fullName: pain.title,
      mentions: pain.mention_count ?? pain.frequency,
      share: pain.share_pct,
    }))
    .reverse()
  const height = Math.max(240, data.length * 42)

  return (
    <ChartFrame
      title="Pain signal frequency"
      description="Recurring complaint mentions, ranked by observed volume."
      table={
        <DataTable
          headers={['Pain theme', 'Mentions', 'Share']}
          rows={data
            .slice()
            .reverse()
            .map((item) => [
              item.fullName,
              item.mentions,
              item.share == null ? '—' : `${item.share.toFixed(1)}%`,
            ])}
        />
      }
    >
      <div style={{ height }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 640, height }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 42, bottom: 0, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={128}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
            <Bar dataKey="mentions" name="Mentions" fill={CHART.primary} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="mentions"
                position="right"
                fill={CHART.text}
                fontSize={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

function PainScoresChart({ painPoints }: { painPoints: LibraryPainPoint[] }) {
  const data = [...painPoints]
    .sort(
      (a, b) =>
        (b.commercial_opportunity ?? b.severity_score) -
        (a.commercial_opportunity ?? a.severity_score),
    )
    .slice(0, 6)
    .map((pain) => ({
      name: shortLabel(pain.title, 15),
      fullName: pain.title,
      severity: pain.severity_score,
      emotion: pain.emotional_intensity ?? null,
      opportunity: pain.commercial_opportunity ?? null,
    }))
  const hasRichScores = data.some(
    (item) => item.emotion != null || item.opportunity != null,
  )

  return (
    <ChartFrame
      title={hasRichScores ? 'Pain cluster scores' : 'Pain severity'}
      description={
        hasRichScores
          ? 'Severity, emotional intensity, and commercial opportunity on a 1–10 scale.'
          : 'Relative severity of the most frequent customer problems.'
      }
      table={
        <DataTable
          headers={['Pain theme', 'Severity', 'Emotion', 'Opportunity']}
          rows={data.map((item) => [
            item.fullName,
            item.severity.toFixed(1),
            item.emotion?.toFixed(1) ?? '—',
            item.opportunity?.toFixed(1) ?? '—',
          ])}
        />
      }
    >
      <div className="h-[280px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 640, height: 280 }}
        >
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 18, left: -24 }}
            accessibilityLayer
          >
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-16}
              textAnchor="end"
              height={54}
            />
            <YAxis
              domain={[0, 10]}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
            <Bar
              dataKey="severity"
              name="Severity"
              fill={CHART.danger}
              radius={[3, 3, 0, 0]}
            />
            {hasRichScores && (
              <>
                <Bar
                  dataKey="emotion"
                  name="Emotion"
                  fill={CHART.warning}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="opportunity"
                  name="Opportunity"
                  fill={CHART.teal}
                  radius={[3, 3, 0, 0]}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

function CompetitorLandscapeChart({ competitors }: { competitors: LibraryCompetitor[] }) {
  const data = [...competitors]
    .filter((item) => item.reviews_count != null || item.rating != null)
    .sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0))
    .slice(0, 8)
    .map((item) => ({
      name: shortLabel(item.name, 15),
      fullName: item.name,
      reviews: item.reviews_count ?? 0,
      rating: item.rating,
    }))

  if (data.length < 2) return null

  return (
    <ChartFrame
      title="Competitor landscape"
      description="Public review volume and average rating for the products in this study."
      table={
        <DataTable
          headers={['Product', 'Reviews', 'Rating']}
          rows={data.map((item) => [
            item.fullName,
            item.reviews.toLocaleString(),
            item.rating?.toFixed(1) ?? '—',
          ])}
        />
      }
    >
      <div className="h-[300px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 640, height: 300 }}
        >
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 18, left: -18 }}
            accessibilityLayer
          >
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-16}
              textAnchor="end"
              height={54}
            />
            <YAxis
              yAxisId="reviews"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="rating"
              orientation="right"
              domain={[0, 5]}
              hide
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
            <Bar
              yAxisId="reviews"
              dataKey="reviews"
              name="Reviews"
              fill={CHART.info}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="rating"
              dataKey="rating"
              name="Rating"
              type="monotone"
              stroke={CHART.primary}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART.surface, strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

function TrendChart({ painPoints }: { painPoints: LibraryPainPoint[] }) {
  const totals = new Map<number, number>()
  for (const pain of painPoints) {
    for (const point of pain.year_counts ?? []) {
      totals.set(point.year, (totals.get(point.year) ?? 0) + point.count)
    }
  }
  const data = [...totals.entries()]
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, mentions]) => ({ year, mentions }))

  if (data.length < 3) return null

  return (
    <ChartFrame
      title="Complaint signal over time"
      description="Annual mentions across the pain clusters included in this report."
      table={
        <DataTable
          headers={['Year', 'Mentions']}
          rows={data.map((item) => [item.year, item.mentions])}
        />
      }
    >
      <div className="h-[260px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 640, height: 260 }}
        >
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="libraryTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="mentions"
              name="Mentions"
              stroke={CHART.primary}
              strokeWidth={2}
              fill="url(#libraryTrendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function LibraryReportCharts({
  painPoints,
  competitors = [],
}: {
  painPoints: LibraryPainPoint[]
  competitors?: LibraryCompetitor[]
}) {
  if (painPoints.length === 0) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PainMentionsChart painPoints={painPoints} />
      <PainScoresChart painPoints={painPoints} />
      <TrendChart painPoints={painPoints} />
      <CompetitorLandscapeChart competitors={competitors} />
    </div>
  )
}
