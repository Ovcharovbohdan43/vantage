import Link from 'next/link'
import { ArrowRight, CalendarDays, TrendingDown, TrendingUp } from 'lucide-react'
import type { IdeaOfWeek } from '@/lib/api/idea-of-week'
import { cn } from '@/lib/utils'

function formatWeek(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function sparkline(points: IdeaOfWeek['trend_data']['points']) {
  const values = points.slice(-20)
  if (values.length < 2) return ''
  const max = Math.max(...values.map((point) => point.value), 1)
  const min = Math.min(...values.map((point) => point.value))
  const span = Math.max(max - min, 1)
  return values
    .map((point, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 34 - ((point.value - min) / span) * 30
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function LandingWeeklyIdea({ idea }: { idea: IdeaOfWeek }) {
  const metrics = idea.trend_data.metrics
  const path = sparkline(idea.trend_data.points)
  const growthPositive = metrics.growth_pct >= 0
  const blueprint = idea.article.content.mvp_blueprint

  return (
    <section
      id="idea-of-the-week"
      className="relative overflow-hidden border-t border-white/[0.06] py-16 md:py-24"
    >
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-v-primary/[0.045] blur-[100px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1120px] px-5 md:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-landing-mono text-[11px] uppercase tracking-[0.16em] text-v-primary">
              Updated every Monday
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-v-on md:text-[2rem]">
              One market idea worth watching this week
            </h2>
          </div>
          <Link
            href="/idea-of-the-week/archive"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-v-muted transition-colors hover:text-v-on"
          >
            Browse archive
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        <article className="overflow-hidden rounded-2xl border border-white/[0.09] bg-v-surface/80 shadow-[0_30px_100px_rgba(0,0,0,0.25)]">
          <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-3.5" />
                  Week of {formatWeek(idea.week_start)}
                </span>
                <span className="text-white/20">/</span>
                <span>{idea.article.category}</span>
              </div>

              <h3 className="mt-6 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.025em] text-v-on sm:text-3xl">
                {idea.headline.replace(/^This week's build:\s*/i, '')}
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-v-muted sm:text-[15px]">
                {idea.dek}
              </p>

              {blueprint && (
                <div className="mt-6 border-l border-v-secondary/45 pl-4">
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-secondary">
                    First customer
                  </p>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-v-on">
                    {blueprint.target_user}
                  </p>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/idea-of-the-week/${idea.week_slug}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-v-on px-5 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-primary"
                >
                  Read this week&apos;s idea
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/research/new?from=landing-weekly-idea"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 px-5 text-sm font-medium text-v-on transition-colors hover:border-white/28 hover:bg-white/[0.03]"
                >
                  Research your market
                </Link>
              </div>
            </div>

            <div className="border-t border-white/[0.08] bg-v-bg/55 p-6 sm:p-8 lg:border-t-0 lg:border-l">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                    Google Trends / worldwide
                  </p>
                  <p className="mt-2 text-sm font-medium text-v-on">“{idea.trend_query}”</p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-landing-mono text-[10px]',
                    growthPositive
                      ? 'border-v-primary/25 bg-v-primary/[0.06] text-v-primary'
                      : 'border-v-error/25 bg-v-error/[0.06] text-v-error',
                  )}
                >
                  {growthPositive ? (
                    <TrendingUp aria-hidden className="size-3" />
                  ) : (
                    <TrendingDown aria-hidden className="size-3" />
                  )}
                  {metrics.growth_pct > 0 ? '+' : ''}
                  {metrics.growth_pct}%
                </span>
              </div>

              <div className="mt-7 h-32 border-y border-white/[0.07] py-3">
                {path ? (
                  <svg
                    viewBox="0 0 100 36"
                    role="img"
                    aria-label={`Recent search interest for ${idea.trend_query}`}
                    className="h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="landing-weekly-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-v-primary)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--color-v-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,36 ${path} 100,36`}
                      fill="url(#landing-weekly-fill)"
                    />
                    <polyline
                      points={path}
                      fill="none"
                      stroke="var(--color-v-primary)"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center font-landing-mono text-[10px] uppercase text-v-muted">
                    Demand signal pending
                  </div>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-4">
                <div>
                  <dt className="font-landing-mono text-[9px] uppercase tracking-wider text-v-muted">
                    Interest
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-v-on">
                    {metrics.current_interest}
                  </dd>
                </div>
                <div>
                  <dt className="font-landing-mono text-[9px] uppercase tracking-wider text-v-muted">
                    Peak
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-v-on">
                    {metrics.peak_interest}
                  </dd>
                </div>
                <div>
                  <dt className="font-landing-mono text-[9px] uppercase tracking-wider text-v-muted">
                    Score
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-v-on">
                    {Math.round(idea.selection_score)}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-[11px] leading-relaxed text-v-muted">
                Automatically selected from published evidence, data confidence, and live search
                momentum.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
