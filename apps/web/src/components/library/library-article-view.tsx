'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackLibraryEvent } from '@/lib/api/library'
import type { LibraryArticle, LibraryPainPoint } from '@/lib/api/library'
import { LibraryEvidence } from '@/components/library/library-evidence'
import { cn } from '@/lib/utils'

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="font-landing-mono text-xs text-v-warn" aria-label={`${rating} stars`}>
      {'★'.repeat(rating)}
      <span className="text-white/20">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
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
    return () => {
      const seconds = Math.round((Date.now() - readStart.current) / 1000)
      if (seconds >= 5) {
        trackLibraryEvent(article.slug, 'read_time', { seconds }).catch(() => {})
      }
    }
  }, [article.slug])

  function openSupportingReviews(clusterId: string) {
    setSupportClusterId(clusterId)
    setTab('evidence')
  }

  const content = article.content
  const dataset = content.dataset

  return (
    <article>
      <div
        className="mb-6 flex gap-1 border-b border-white/[0.06]"
        role="tablist"
        aria-label="Article sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'research'}
          onClick={() => setTab('research')}
          className={cn(
            '-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors',
            tab === 'research'
              ? 'border-v-primary text-v-on'
              : 'border-transparent text-v-muted hover:text-v-on',
          )}
        >
          Research
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'evidence'}
          onClick={() => setTab('evidence')}
          className={cn(
            '-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors',
            tab === 'evidence'
              ? 'border-v-primary text-v-on'
              : 'border-transparent text-v-muted hover:text-v-on',
          )}
        >
          Evidence
        </button>
      </div>

      {tab === 'evidence' ? (
        <LibraryEvidence slug={article.slug} initialClusterId={supportClusterId} />
      ) : (
        <div className="space-y-10">
          <header>
            <p className="mb-2 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              {article.category}
            </p>
            <h1 className="mb-4 text-2xl font-semibold leading-tight tracking-tight text-v-on md:text-[1.75rem]">
              {article.title}
            </h1>
            <p className="text-sm leading-relaxed text-v-muted md:text-[15px]">
              {article.executive_summary}
            </p>
          </header>

          <section>
            <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Dataset
            </h2>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.06] text-sm sm:grid-cols-2">
              {[
                { label: 'Products analyzed', value: String(dataset.products_analyzed) },
                { label: 'Reviews analyzed', value: String(dataset.reviews_analyzed) },
                { label: 'Source', value: dataset.sources.join(', ') },
                { label: 'Ratings analyzed', value: '★1–★3' },
              ].map((row) => (
                <div key={row.label} className="bg-v-bg px-4 py-3">
                  <dt className="mb-0.5 text-xs text-v-muted">{row.label}</dt>
                  <dd className="font-medium tabular-nums text-v-on">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Market saturation
            </h2>
            <div className="border-y border-white/[0.06] py-4">
              <p className="mb-1 text-sm font-semibold text-v-on">
                {content.market_saturation.level} · {content.market_saturation.competition_level}{' '}
                competition
              </p>
              <p className="text-sm leading-relaxed text-v-muted">
                {content.market_saturation.explanation}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Top customer pain points
            </h2>
            <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {content.pain_points.map((pain: LibraryPainPoint) => (
                <div key={pain.cluster_id} className="py-5">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-v-on">{pain.title}</h3>
                    <span className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
                      {pain.frequency} mentions · severity {pain.severity_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mb-2 text-sm leading-relaxed text-v-muted">{pain.explanation}</p>
                  <p className="mb-4 text-xs text-v-muted">{pain.why_critical}</p>
                  <div className="mb-4 space-y-3">
                    {pain.quotes.map((quote, i) => (
                      <blockquote
                        key={i}
                        className="border-l-2 border-v-primary/40 bg-white/[0.02] py-2 pl-3"
                      >
                        <div className="mb-1">
                          <StarRating rating={quote.rating} />
                        </div>
                        <p className="text-sm leading-relaxed text-v-on">
                          &ldquo;{quote.text}&rdquo;
                        </p>
                        <p className="mt-1 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                          {quote.product} · {quote.source.toUpperCase()}
                        </p>
                      </blockquote>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openSupportingReviews(pain.cluster_id)}
                    className="text-xs font-medium text-v-primary underline underline-offset-2 transition-opacity hover:opacity-80"
                  >
                    View evidence
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Market opportunities
            </h2>
            <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {content.market_opportunities.map((opp, i) => (
                <li key={i} className="grid gap-2 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                  <span className="font-landing-mono text-xs tabular-nums text-v-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="mb-1 text-sm font-semibold text-v-on">{opp.title}</p>
                    <p className="text-sm leading-relaxed text-v-muted">{opp.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Risk analysis
            </h2>
            <div className="overflow-x-auto border border-white/[0.08]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-left">
                    <th className="p-3 font-landing-mono text-[11px] font-medium uppercase tracking-wider text-v-muted">
                      Risk
                    </th>
                    <th className="p-3 font-landing-mono text-[11px] font-medium uppercase tracking-wider text-v-muted">
                      Level
                    </th>
                    <th className="p-3 font-landing-mono text-[11px] font-medium uppercase tracking-wider text-v-muted">
                      Explanation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {content.risk_analysis.map((risk) => (
                    <tr key={risk.risk} className="border-b border-white/[0.06] last:border-0">
                      <td className="p-3 font-medium text-v-on">{risk.risk}</td>
                      <td className="p-3 capitalize text-v-muted">{risk.level}</td>
                      <td className="p-3 leading-relaxed text-v-muted">{risk.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Final takeaway
            </h2>
            <p className="border-y border-white/[0.06] py-4 text-sm leading-relaxed text-v-on">
              {content.final_takeaway}
            </p>
          </section>

          <section className="rounded-lg border border-white/[0.08] bg-v-surface p-6">
            <p className="mb-2 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
              Have an idea in this space?
            </p>
            <p className="mb-4 text-sm leading-relaxed text-v-muted">
              Run your own market pain analysis — grounded in real negative reviews, not guesswork.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                onClick={() => trackLibraryEvent(article.slug, 'cta_signup').catch(() => {})}
                className="inline-flex h-10 items-center justify-center rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
              >
                Create free account
              </Link>
              <Link
                href="/research/new"
                onClick={() => trackLibraryEvent(article.slug, 'cta_research').catch(() => {})}
                className="inline-flex h-10 items-center justify-center rounded-md border border-white/14 px-4 text-sm font-medium text-v-on transition-colors hover:border-white/28"
              >
                Start research
              </Link>
            </div>
          </section>
        </div>
      )}
    </article>
  )
}
