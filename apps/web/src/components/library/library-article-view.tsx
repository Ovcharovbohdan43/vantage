'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Eye,
  Lightbulb,
  Quote,
  Target,
  UserRound,
  Workflow,
} from 'lucide-react'
import { LibraryEvidence } from '@/components/library/library-evidence'
import { LibraryReportCharts } from '@/components/library/library-report-charts'
import { ShareReport } from '@/components/share-report'
import { trackLibraryEvent } from '@/lib/api/library'
import type { LibraryArticle, LibraryPainPoint } from '@/lib/api/library'
import { buildLibraryReportPost } from '@/lib/share-report'
import { cn } from '@/lib/utils'

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="font-landing-mono text-xs text-v-warn" aria-label={`${rating} stars`}>
      {'★'.repeat(rating)}
      <span className="text-white/20">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: value >= 10_000 ? 'compact' : 'standard' }).format(
    value,
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function Metric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'primary' | 'danger' | 'teal'
}) {
  const tones = {
    default: 'text-v-on',
    primary: 'text-v-primary',
    danger: 'text-v-error',
    teal: 'text-v-secondary',
  }

  return (
    <div className="min-w-0 bg-v-bg px-4 py-3.5">
      <dt className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
        {label}
      </dt>
      <dd className={cn('mt-1 text-xl font-semibold tabular-nums tracking-tight', tones[tone])}>
        {value}
      </dd>
      {detail && <p className="mt-0.5 truncate text-[11px] text-v-muted">{detail}</p>}
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-4">
      <p className="font-landing-mono text-[10px] uppercase tracking-[0.16em] text-v-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-v-on sm:text-xl">{title}</h2>
      {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-v-muted">{description}</p>}
    </div>
  )
}

function SignalPill({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'danger' | 'teal' | 'warning'
}) {
  const tones = {
    default: 'border-white/10 bg-white/[0.03] text-v-muted',
    danger: 'border-v-error/25 bg-v-error/[0.06] text-v-error',
    teal: 'border-v-secondary/25 bg-v-secondary/[0.06] text-v-secondary',
    warning: 'border-v-warn/25 bg-v-warn/[0.06] text-v-warn',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-landing-mono text-[10px] uppercase tracking-wider',
        tones[tone],
      )}
    >
      <span>{label}</span>
      <strong className="font-semibold tabular-nums text-current">{value}</strong>
    </span>
  )
}

function PainFinding({
  pain,
  rank,
  onEvidence,
}: {
  pain: LibraryPainPoint
  rank: number
  onEvidence: (clusterId: string) => void
}) {
  const mentions = pain.mention_count ?? pain.frequency
  const trend = pain.trend

  return (
    <div className="border-t border-white/[0.07] py-6 first:border-t-0 first:pt-0">
      <div className="grid gap-4 md:grid-cols-[3rem_minmax(0,1fr)]">
        <div className="font-landing-mono text-sm tabular-nums text-v-muted">
          {String(rank).padStart(2, '0')}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-base font-semibold leading-snug text-v-on">{pain.title}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <SignalPill label="mentions" value={formatNumber(mentions)} tone="danger" />
                <SignalPill
                  label="severity"
                  value={`${pain.severity_score.toFixed(1)}/10`}
                  tone="warning"
                />
                {pain.share_pct != null && (
                  <SignalPill label="cluster share" value={`${pain.share_pct.toFixed(1)}%`} />
                )}
                {pain.commercial_opportunity != null && (
                  <SignalPill
                    label="opportunity"
                    value={`${pain.commercial_opportunity.toFixed(1)}/10`}
                    tone="teal"
                  />
                )}
                {trend && <SignalPill label="trend" value={trend} />}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                What customers report
              </p>
              <p className="mt-2 text-sm leading-relaxed text-v-on">{pain.explanation}</p>
            </div>
            <div className="rounded-md border border-v-primary/15 bg-v-primary/[0.035] p-4">
              <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                Why it matters
              </p>
              <p className="mt-2 text-sm leading-relaxed text-v-muted">
                {pain.why_opportunity || pain.why_critical}
              </p>
            </div>
          </div>

          {(pain.top_terms?.length || pain.sub_themes?.length) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {!!pain.top_terms?.length && (
                <div>
                  <p className="mb-2 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                    Repeated terms
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pain.top_terms.slice(0, 6).map((term) => (
                      <span
                        key={term.term}
                        className="rounded border border-white/[0.08] bg-white/[0.025] px-2 py-1 font-landing-mono text-[10px] text-v-muted"
                      >
                        {term.term} <span className="text-v-on">{term.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!!pain.sub_themes?.length && (
                <div>
                  <p className="mb-2 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                    Sub-themes
                  </p>
                  <div className="space-y-1.5">
                    {pain.sub_themes.slice(0, 4).map((theme) => (
                      <div
                        key={theme.title}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="truncate text-v-muted">{theme.title}</span>
                        <span className="font-landing-mono tabular-nums text-v-on">
                          {theme.frequency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {pain.quotes.slice(0, 2).map((quote, index) => (
              <blockquote
                key={`${quote.product}-${index}`}
                className="relative rounded-md border border-white/[0.07] bg-v-surface p-4"
              >
                <Quote className="absolute right-3 top-3 size-4 text-white/10" aria-hidden="true" />
                <StarRating rating={quote.rating} />
                <p className="mt-2 pr-4 text-sm leading-relaxed text-v-on">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <footer className="mt-3 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                  {quote.product} · {quote.source.toUpperCase()}
                </footer>
              </blockquote>
            ))}
          </div>

          <button
            type="button"
            aria-label="View evidence"
            onClick={() => onEvidence(pain.cluster_id)}
            className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 text-xs font-medium text-v-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-primary"
          >
            View all supporting evidence
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface LibraryArticleViewProps {
  article: LibraryArticle
}

export function LibraryArticleView({ article }: LibraryArticleViewProps) {
  const [tab, setTab] = useState<'research' | 'evidence'>('research')
  const [supportClusterId, setSupportClusterId] = useState<string | null>(null)
  const readStart = useRef(Date.now())
  const viewTracked = useRef(false)

  useEffect(() => {
    if (viewTracked.current) return
    viewTracked.current = true
    trackLibraryEvent(article.slug, 'view').catch(() => {})
  }, [article.slug])

  useEffect(() => {
    const startedAt = readStart.current
    return () => {
      const seconds = Math.round((Date.now() - startedAt) / 1000)
      if (seconds >= 5) {
        trackLibraryEvent(article.slug, 'read_time', { seconds }).catch(() => {})
      }
    }
  }, [article.slug])

  function openSupportingReviews(clusterId: string) {
    setSupportClusterId(clusterId)
    setTab('evidence')
    document.documentElement.scrollTop = 0
  }

  const content = article.content
  const dataset = content.dataset
  const scores = content.scores
  const stats = content.stats
  const publishedAt = formatDate(article.published_at)
  const analyzedAt = formatDate(dataset.analyzed_at)
  const topPain = [...content.pain_points].sort(
    (a, b) => (b.mention_count ?? b.frequency) - (a.mention_count ?? a.frequency),
  )[0]

  return (
    <article>
      <header className="border-b border-white/[0.07] pb-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-landing-mono text-[10px] uppercase tracking-[0.14em] text-v-muted">
          <span className="text-v-primary">{article.category}</span>
          <span className="text-white/20">/</span>
          <span>Public market report</span>
          {publishedAt && (
            <>
              <span className="text-white/20">/</span>
              <time dateTime={article.published_at ?? undefined}>{publishedAt}</time>
            </>
          )}
        </div>
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-v-on sm:text-4xl lg:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-v-muted sm:text-lg">
          {article.executive_summary}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-v-muted">
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" aria-hidden="true" />
            {formatNumber(dataset.reviews_analyzed)} verified review signals
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            {content.pain_points.length} recurring pain clusters
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden="true" />
            {formatNumber(article.view_count)} views
          </span>
        </div>
      </header>

      <div
        className="sticky top-0 z-20 -mx-4 mb-8 flex gap-1 border-b border-white/[0.07] bg-v-bg/95 px-4 backdrop-blur sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Article sections"
      >
        {(['research', 'evidence'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={cn(
              '-mb-px min-h-11 cursor-pointer border-b-2 px-3 text-[13px] capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-v-primary',
              tab === item
                ? 'border-v-primary text-v-on'
                : 'border-transparent text-v-muted hover:text-v-on',
            )}
          >
            {item === 'research' ? 'Research' : 'Evidence'}
          </button>
        ))}
      </div>

      {tab === 'evidence' ? (
        <LibraryEvidence slug={article.slug} initialClusterId={supportClusterId} />
      ) : (
        <div className="space-y-14">
          <section>
            <SectionHeading
              eyebrow="01 / Market snapshot"
              title="What the dataset says at a glance"
              description="Scores summarize the observed market, while the underlying counts remain visible for context."
            />
            <dl className="grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-5">
              <Metric
                label="Market score"
                value={scores ? `${Math.round(scores.market_score)}/100` : content.market_saturation.level}
                detail="Opportunity strength"
                tone="primary"
              />
              <Metric
                label="Risk score"
                value={scores ? `${Math.round(scores.risk_score)}/100` : content.market_saturation.competition_level}
                detail="Competitive pressure"
                tone="danger"
              />
              <Metric
                label="Pain signals"
                value={formatNumber(stats?.pain_signals ?? topPain?.frequency ?? 0)}
                detail={`${stats?.clusters_found ?? content.pain_points.length} clusters`}
                tone="teal"
              />
              <Metric
                label="Reviews"
                value={formatNumber(dataset.reviews_analyzed)}
                detail={`${dataset.products_analyzed} products`}
              />
              <Metric
                label="Confidence"
                value={scores ? `${scores.confidence_pct}%` : 'Evidence-backed'}
                detail={scores?.data_confidence ?? dataset.sources.join(' + ')}
              />
            </dl>

            {topPain && (
              <div className="mt-4 grid overflow-hidden rounded-lg border border-v-primary/20 bg-v-primary/[0.035] md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="p-4 sm:p-5">
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                    Strongest observed signal
                  </p>
                  <p className="mt-2 text-base font-semibold text-v-on">{topPain.title}</p>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-v-muted">
                    {topPain.why_opportunity || topPain.why_critical}
                  </p>
                </div>
                <div className="flex items-center border-t border-v-primary/15 px-5 py-4 md:border-l md:border-t-0">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-v-primary">
                      {formatNumber(topPain.mention_count ?? topPain.frequency)}
                    </p>
                    <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                      mentions
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              eyebrow="02 / Signal map"
              title="Where customer frustration concentrates"
              description="Every chart uses stored report analytics. AI writes the narrative but does not create the numbers."
            />
            <LibraryReportCharts
              painPoints={content.pain_points}
              competitors={content.competitors}
            />
          </section>

          <section>
            <SectionHeading
              eyebrow="03 / Findings"
              title="The pain points behind the numbers"
              description="Ranked clusters connect quantified signals to real customer language and source evidence."
            />
            <div className="rounded-lg border border-white/[0.08] bg-v-bg p-4 sm:p-6">
              {content.pain_points.map((pain, index) => (
                <PainFinding
                  key={pain.cluster_id}
                  pain={pain}
                  rank={index + 1}
                  onEvidence={openSupportingReviews}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <div>
              <SectionHeading
                eyebrow="04 / Opportunity gaps"
                title="Patterns the market still leaves unresolved"
              />
              <ol className="overflow-hidden rounded-lg border border-white/[0.08]">
                {content.market_opportunities.map((opportunity, index) => (
                  <li
                    key={opportunity.title}
                    className="grid gap-3 border-b border-white/[0.06] p-4 last:border-0 sm:grid-cols-[2rem_minmax(0,1fr)]"
                  >
                    <span className="font-landing-mono text-xs tabular-nums text-v-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-v-on">{opportunity.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-v-muted">{opportunity.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <SectionHeading eyebrow="05 / Risk register" title="What could weaken the case" />
              <div className="overflow-hidden rounded-lg border border-white/[0.08]">
                {content.risk_analysis.map((risk) => (
                  <div key={risk.risk} className="border-b border-white/[0.06] p-4 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-v-on">{risk.risk}</h3>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 font-landing-mono text-[9px] uppercase tracking-wider',
                          risk.level === 'high'
                            ? 'border-v-error/25 bg-v-error/[0.06] text-v-error'
                            : risk.level === 'medium'
                              ? 'border-v-warn/25 bg-v-warn/[0.06] text-v-warn'
                              : 'border-v-secondary/25 bg-v-secondary/[0.06] text-v-secondary',
                        )}
                      >
                        {risk.level}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-v-muted">{risk.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border border-white/[0.08] bg-v-surface p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                Research conclusion
              </p>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-v-on">
                {content.final_takeaway}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.07] text-xs">
              <div className="bg-v-bg p-3">
                <dt className="text-v-muted">Sources</dt>
                <dd className="mt-1 font-medium text-v-on">{dataset.sources.join(', ')}</dd>
              </div>
              <div className="bg-v-bg p-3">
                <dt className="text-v-muted">Ratings</dt>
                <dd className="mt-1 font-medium text-v-on">★{dataset.rating_range}</dd>
              </div>
              <div className="bg-v-bg p-3">
                <dt className="text-v-muted">Analyzed</dt>
                <dd className="mt-1 font-medium text-v-on">{analyzedAt ?? 'Current dataset'}</dd>
              </div>
              <div className="bg-v-bg p-3">
                <dt className="text-v-muted">Method</dt>
                <dd className="mt-1 font-medium text-v-on">Negative-review clustering</dd>
              </div>
            </dl>
          </section>

          {content.mvp_blueprint && (
            <section
              aria-labelledby="mvp-blueprint-title"
              className="overflow-hidden rounded-lg border border-v-primary/25 bg-v-surface"
            >
              <div className="border-b border-white/[0.08] bg-[linear-gradient(135deg,rgba(198,255,87,0.09),transparent_58%)] p-5 sm:p-7">
                <p className="font-landing-mono text-[10px] uppercase tracking-[0.16em] text-v-primary">
                  06 / Founder blueprint
                </p>
                <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
                  <div>
                    <div className="flex items-center gap-2 text-v-primary">
                      <Lightbulb aria-hidden className="size-5" strokeWidth={1.7} />
                      <span className="font-landing-mono text-xs uppercase tracking-wider">
                        Evidence-built MVP
                      </span>
                    </div>
                    <h2
                      id="mvp-blueprint-title"
                      className="mt-3 text-2xl font-semibold tracking-tight text-v-on sm:text-3xl"
                    >
                      {content.mvp_blueprint.concept_name}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-v-muted sm:text-base">
                      {content.mvp_blueprint.product_concept}
                    </p>
                  </div>
                  <div className="rounded-md border border-v-primary/20 bg-v-bg/70 p-4">
                    <div className="flex items-center gap-2 text-v-primary">
                      <Target aria-hidden className="size-4" />
                      <p className="font-landing-mono text-[10px] uppercase tracking-wider">
                        Value proposition
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-v-on">
                      {content.mvp_blueprint.value_proposition}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.07] lg:grid-cols-2">
                <div className="bg-v-bg p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <UserRound aria-hidden className="size-4 text-v-secondary" />
                    <h3 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                      First customer
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-v-on">
                    {content.mvp_blueprint.target_user}
                  </p>
                </div>
                <div className="bg-v-bg p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Workflow aria-hidden className="size-4 text-v-secondary" />
                    <h3 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                      Core workflow
                    </h3>
                  </div>
                  <ol className="mt-3 space-y-3">
                    {content.mvp_blueprint.core_workflow.map((step, index) => (
                      <li key={step} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-sm">
                        <span className="font-landing-mono text-xs tabular-nums text-v-primary">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="leading-relaxed text-v-on">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="border-t border-white/[0.08] p-5 sm:p-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                      MVP feature set
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-v-on">
                      Every feature answers a documented competitor gap
                    </h3>
                  </div>
                  <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                    {content.mvp_blueprint.features.length} evidence-linked features
                  </p>
                </div>
                <ol className="mt-5 grid gap-3 lg:grid-cols-2">
                  {content.mvp_blueprint.features.map((feature, index) => (
                    <li
                      key={`${feature.name}-${index}`}
                      className="rounded-md border border-white/[0.08] bg-v-bg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-landing-mono text-xs tabular-nums text-v-primary">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-v-on">{feature.name}</h4>
                          <p className="mt-2 text-xs leading-relaxed text-v-error/90">
                            <span className="font-medium text-v-muted">Competitor problem — </span>
                            {feature.problem_solved}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-v-on">{feature.solution}</p>
                          <p className="mt-3 font-landing-mono text-[9px] uppercase tracking-wider text-v-muted">
                            Evidence: {feature.evidence_cluster_ids.join(' · ')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid gap-px border-t border-white/[0.08] bg-white/[0.07] lg:grid-cols-2">
                <div className="bg-v-bg p-5 sm:p-6">
                  <h3 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-secondary">
                    In this MVP
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {content.mvp_blueprint.in_scope.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-v-on">
                        <CheckCircle2
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-v-secondary"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-v-bg p-5 sm:p-6">
                  <h3 className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                    Deliberately later
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {content.mvp_blueprint.out_of_scope.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-v-muted">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-white/25" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-white/[0.08] bg-v-primary/[0.04] px-5 py-4 sm:px-7">
                <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
                  MVP success signal
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-v-on">
                  {content.mvp_blueprint.success_metric}
                </p>
              </div>
            </section>
          )}

          <ShareReport
            payload={buildLibraryReportPost(article)}
            draftSource={{ kind: 'library', slug: article.slug }}
          />

          <section className="rounded-lg border border-v-primary/20 bg-v-primary/[0.04] p-6 sm:p-8">
            <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
              Validate your own market
            </p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-v-on">
                  Turn your idea into an evidence-backed decision.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-v-muted">
                  Private reports add a personalized verdict, competitor strategy, feature priorities,
                  and next steps grounded in your exact idea.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/signup"
                  onClick={() => trackLibraryEvent(article.slug, 'cta_signup').catch(() => {})}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-primary"
                >
                  Create free account
                </Link>
                <Link
                  href="/research/new"
                  onClick={() => trackLibraryEvent(article.slug, 'cta_research').catch(() => {})}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/14 px-4 text-sm font-medium text-v-on transition-colors hover:border-white/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-primary"
                >
                  Start research
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </article>
  )
}
