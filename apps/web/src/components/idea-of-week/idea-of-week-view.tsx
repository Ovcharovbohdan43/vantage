import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GitBranch,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { WeeklyTrendChart } from '@/components/idea-of-week/weekly-trend-chart'
import { ShareReport } from '@/components/share-report'
import type { IdeaOfWeek } from '@/lib/api/idea-of-week'
import { buildIdeaOfWeekPost } from '@/lib/share-report'
import { cn } from '@/lib/utils'

function formatWeek(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="bg-v-bg p-4">
      <dt className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-v-on">{value}</dd>
      <p className="mt-1 text-[11px] leading-relaxed text-v-muted">{detail}</p>
    </div>
  )
}

export function IdeaOfWeekView({ idea }: { idea: IdeaOfWeek }) {
  const { article, trend_data: trend } = idea
  const blueprint = article.content.mvp_blueprint
  const metrics = trend.metrics ?? {
    current_interest: 0,
    previous_interest: 0,
    growth_pct: 0,
    peak_interest: 0,
  }
  const growthPositive = metrics.growth_pct >= 0
  const related = trend.related_queries?.rising?.length
    ? trend.related_queries.rising
    : trend.related_queries?.top ?? []

  return (
    <article className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-5 sm:py-10 md:px-8">
      <nav className="flex flex-wrap items-center gap-2 font-landing-mono text-[11px] text-v-muted">
        <Link href="/idea-of-the-week" className="hover:text-v-on">
          ideas
        </Link>
        <span aria-hidden>/</span>
        <span className="text-v-on">{idea.week_slug}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-v-primary/25 bg-v-primary/[0.06] px-2.5 py-1 text-v-primary">
          <span className="size-1.5 rounded-full bg-v-primary" aria-hidden />
          weekly release
        </span>
      </nav>

      <div className="mt-5 overflow-hidden rounded-lg border border-white/[0.09] bg-v-surface">
        <header className="border-b border-white/[0.08] bg-[radial-gradient(circle_at_85%_15%,rgba(232,255,71,0.11),transparent_32%)] p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="size-3.5" />
              Week of {formatWeek(idea.week_start)}
            </span>
            <span className="text-white/20">•</span>
            <span>{article.category}</span>
            <span className="text-white/20">•</span>
            <span>Auto-selected from {idea.selection_inputs.candidate_count ?? 'published'} reports</span>
          </div>
          <div className="mt-6 max-w-4xl">
            <p className="font-landing-mono text-[11px] uppercase tracking-[0.18em] text-v-primary">
              Idea of the Week
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] text-v-on sm:text-5xl">
              {idea.headline}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-v-muted sm:text-lg">{idea.dek}</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 border-white/[0.08] lg:border-r">
            <section className="border-b border-white/[0.08] p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <BookOpen aria-hidden className="size-4 text-v-primary" />
                <h2 className="font-landing-mono text-[11px] uppercase tracking-wider text-v-on">
                  README.md
                </h2>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-v-on">Why this idea, this week</h3>
              <p className="mt-3 text-sm leading-7 text-v-muted">{idea.why_this_week}</p>

              {blueprint && (
                <>
                  <h3 className="mt-8 text-xl font-semibold text-v-on">The product</h3>
                  <p className="mt-3 text-sm leading-7 text-v-muted">{blueprint.product_concept}</p>
                  <div className="mt-5 rounded-md border border-v-secondary/20 bg-v-secondary/[0.04] p-4">
                    <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-secondary">
                      First user
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-v-on">{blueprint.target_user}</p>
                  </div>
                </>
              )}
            </section>

            <section className="border-b border-white/[0.08] p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                    Google Trends / worldwide
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-v-on">
                    Search demand for “{idea.trend_query}”
                  </h2>
                </div>
                <div
                  className={cn(
                    'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-landing-mono text-xs',
                    growthPositive
                      ? 'border-v-primary/25 bg-v-primary/[0.06] text-v-primary'
                      : 'border-v-error/25 bg-v-error/[0.06] text-v-error',
                  )}
                >
                  {growthPositive ? (
                    <TrendingUp aria-hidden className="size-3.5" />
                  ) : (
                    <TrendingDown aria-hidden className="size-3.5" />
                  )}
                  {metrics.growth_pct > 0 ? '+' : ''}
                  {metrics.growth_pct}% latest window
                </div>
              </div>

              <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
                <Metric
                  label="Current interest"
                  value={`${metrics.current_interest}`}
                  detail="Latest 4-week average / 100"
                />
                <Metric
                  label="Peak"
                  value={`${metrics.peak_interest}`}
                  detail="Highest week in 12 months"
                />
                <Metric
                  label="Selection score"
                  value={`${Math.round(idea.selection_score)}`}
                  detail="Evidence + demand + momentum"
                />
              </dl>

              <div className="mt-5">
                <WeeklyTrendChart points={trend.points ?? []} query={idea.trend_query} />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-v-muted">
                Google Trends values are relative search interest, normalized from 0 to 100. They are
                directional demand signals, not absolute search volume.
              </p>
            </section>

            {blueprint && (
              <section className="border-b border-white/[0.08] p-5 sm:p-7">
                <div className="flex items-center gap-2">
                  <GitBranch aria-hidden className="size-4 text-v-primary" />
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                    MVP scope
                  </p>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-v-on">
                  Build the wedge competitors still miss
                </h2>
                <ol className="mt-5 overflow-hidden rounded-md border border-white/[0.08]">
                  {blueprint.features.map((feature, index) => (
                    <li
                      key={`${feature.name}-${index}`}
                      className="grid gap-3 border-b border-white/[0.07] p-4 last:border-0 sm:grid-cols-[2rem_minmax(0,1fr)]"
                    >
                      <span className="font-landing-mono text-xs text-v-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-v-on">{feature.name}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-v-error/90">
                          Competitor gap — {feature.problem_solved}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-v-muted">{feature.solution}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 rounded-md border border-v-primary/20 bg-v-primary/[0.04] p-4">
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                    Success looks like
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-v-on">
                    {blueprint.success_metric}
                  </p>
                </div>
              </section>
            )}

            <ShareReport
              payload={buildIdeaOfWeekPost(idea)}
              draftSource={{ kind: 'idea-of-week', week: idea.week_slug }}
              className="rounded-none border-x-0 border-t-0 p-5 sm:p-7"
            />

            <section className="p-5 sm:p-7">
              <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                Run your own evidence check
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-v-on">
                Would this idea work for your market?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-v-muted">
                Start a private research run to test your exact audience, competitors, and product angle.
              </p>
              <Link
                href={`/research/new?from=idea-of-the-week&category=${encodeURIComponent(article.category)}`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-primary"
              >
                Start research
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </section>
          </div>

          <aside className="min-w-0 bg-v-bg/45 p-5 sm:p-6">
            <section>
              <h2 className="text-sm font-semibold text-v-on">About this pick</h2>
              <p className="mt-3 text-xs leading-6 text-v-muted">{article.executive_summary}</p>
              <Link
                href={`/library/${article.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-v-primary hover:underline"
              >
                Read source report
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </section>

            <section className="mt-7 border-t border-white/[0.08] pt-6">
              <h2 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                Selection inputs
              </h2>
              <dl className="mt-3 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-v-muted">Market score</dt>
                  <dd className="font-landing-mono text-v-on">
                    {idea.selection_inputs.market_score ?? '—'}/100
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-v-muted">Confidence</dt>
                  <dd className="font-landing-mono capitalize text-v-on">
                    {idea.selection_inputs.data_confidence ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-v-muted">Reviews</dt>
                  <dd className="font-landing-mono text-v-on">{article.reviews_count}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-v-muted">Products</dt>
                  <dd className="font-landing-mono text-v-on">{article.products_count}</dd>
                </div>
              </dl>
            </section>

            {related.length > 0 && (
              <section className="mt-7 border-t border-white/[0.08] pt-6">
                <div className="flex items-center gap-2">
                  <Search aria-hidden className="size-3.5 text-v-primary" />
                  <h2 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                    Rising searches
                  </h2>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {related.slice(0, 6).map((item) => (
                    <li key={item.query} className="flex items-start justify-between gap-3 text-xs">
                      <span className="leading-relaxed text-v-on">{item.query}</span>
                      <span className="shrink-0 font-landing-mono text-v-primary">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-7 border-t border-white/[0.08] pt-6">
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-3.5 text-v-primary" />
                <h2 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                  How it is selected
                </h2>
              </div>
              <ul className="mt-3 space-y-2.5">
                {[
                  'Published research evidence',
                  'Market opportunity score',
                  'Data confidence',
                  'Google search momentum',
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-xs text-v-muted">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-v-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/idea-of-the-week/archive"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-v-on hover:text-v-primary"
              >
                Browse weekly archive
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </article>
  )
}
