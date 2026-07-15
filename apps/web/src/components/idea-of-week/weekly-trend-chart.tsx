'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { WeeklyTrendPoint } from '@/lib/api/idea-of-week'

function tickDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(timestamp * 1000))
}

export function WeeklyTrendChart({
  points,
  query,
}: {
  points: WeeklyTrendPoint[]
  query: string
}) {
  const hasSignal = points.some((point) => point.value > 0)
  if (!points.length || !hasSignal) {
    return (
      <div className="flex h-64 items-center justify-center border-y border-dashed border-white/10 text-center">
        <div>
          <p className="font-landing-mono text-xs uppercase tracking-wider text-v-muted">
            Trend signal unavailable
          </p>
          <p className="mt-2 text-sm text-v-muted">The market report still drives this week&apos;s pick.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 16, right: 8, bottom: 4, left: -24 }}>
            <defs>
              <linearGradient id="weekly-demand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8ff47" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#e8ff47" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={tickDate}
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={42}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(_label, payload) => payload[0]?.payload?.date ?? ''}
              formatter={(value) => [`${value}/100`, query]}
              contentStyle={{
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: '#f4f4f5',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#e8ff47"
              strokeWidth={2}
              fill="url(#weekly-demand)"
              activeDot={{ r: 4, fill: '#e8ff47', stroke: '#0d0d0d', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="border-t border-white/[0.06] py-3 text-xs">
        <summary className="cursor-pointer font-landing-mono uppercase tracking-wider text-v-muted hover:text-v-on">
          View weekly data
        </summary>
        <div className="mt-3 max-h-56 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-v-surface">
              <tr className="border-b border-white/10">
                <th className="py-2 font-landing-mono text-[10px] uppercase text-v-muted">Week</th>
                <th className="py-2 text-right font-landing-mono text-[10px] uppercase text-v-muted">
                  Interest
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.timestamp} className="border-b border-white/[0.05]">
                  <td className="py-2 text-v-muted">{point.date}</td>
                  <td className="py-2 text-right font-landing-mono text-v-on">{point.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
