'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackLibraryEvent } from '@/lib/api/library'
import type { LibraryArticle, LibraryPainPoint } from '@/lib/api/library'
import { LibraryEvidence } from '@/components/library/library-evidence'
import { cn } from '@/lib/utils'

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="font-mono text-xs text-[#ff8adf]" aria-label={`${rating} stars`}>
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
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('research')}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'research'
              ? 'border-[#d0bcff]/45 bg-[#d0bcff]/15 text-[#d0bcff]'
              : 'border-white/10 text-[#958ea0] hover:border-[#d0bcff]/30 hover:text-[#cbc3d7]',
          )}
        >
          Research
        </button>
        <button
          type="button"
          onClick={() => setTab('evidence')}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'evidence'
              ? 'border-[#d0bcff]/45 bg-[#d0bcff]/15 text-[#d0bcff]'
              : 'border-white/10 text-[#958ea0] hover:border-[#d0bcff]/30 hover:text-[#cbc3d7]',
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
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
              {article.category}
            </p>
            <h1 className="mb-4 text-2xl font-semibold leading-tight tracking-tight text-[#e5e1e4]">
              {article.title}
            </h1>
            <p className="text-sm leading-relaxed text-[#cbc3d7]">{article.executive_summary}</p>
          </header>

          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">Dataset</h2>
            <dl className="grid gap-3 rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="mb-0.5 text-xs text-[#958ea0]">Products analyzed</dt>
                <dd className="font-semibold tabular-nums text-[#e5e1e4]">
                  {dataset.products_analyzed}
                </dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-[#958ea0]">Reviews analyzed</dt>
                <dd className="font-semibold tabular-nums text-[#e5e1e4]">
                  {dataset.reviews_analyzed}
                </dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-[#958ea0]">Source</dt>
                <dd className="font-medium text-[#cbc3d7]">{dataset.sources.join(', ')}</dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-[#958ea0]">Ratings analyzed</dt>
                <dd className="font-medium text-[#cbc3d7]">★1–★3</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
              Market Saturation
            </h2>
            <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4">
              <p className="mb-1 text-sm font-semibold text-[#e5e1e4]">
                {content.market_saturation.level} · {content.market_saturation.competition_level}{' '}
                competition
              </p>
              <p className="text-sm leading-relaxed text-[#cbc3d7]">
                {content.market_saturation.explanation}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
              Top Customer Pain Points
            </h2>
            <div className="space-y-4">
              {content.pain_points.map((pain: LibraryPainPoint) => (
                <div
                  key={pain.cluster_id}
                  className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-5"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#e5e1e4]">{pain.title}</h3>
                    <span className="font-mono text-[10px] uppercase text-[#958ea0]">
                      {pain.frequency} mentions · severity {pain.severity_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mb-2 text-sm leading-relaxed text-[#cbc3d7]">{pain.explanation}</p>
                  <p className="mb-4 text-xs text-[#958ea0]">{pain.why_critical}</p>
                  <div className="mb-4 space-y-3">
                    {pain.quotes.map((quote, i) => (
                      <blockquote key={i} className="border-l-2 border-[#d0bcff]/40 pl-3">
                        <div className="mb-1">
                          <StarRating rating={quote.rating} />
                        </div>
                        <p className="text-sm italic leading-relaxed text-[#e5e1e4]">
                          &ldquo;{quote.text}&rdquo;
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase text-[#958ea0]">
                          {quote.product} · {quote.source.toUpperCase()}
                        </p>
                      </blockquote>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openSupportingReviews(pain.cluster_id)}
                    className="text-xs font-medium text-[#d0bcff] underline underline-offset-2 hover:text-[#e5e1e4]"
                  >
                    View evidence
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
              Market Opportunities
            </h2>
            <div className="space-y-3">
              {content.market_opportunities.map((opp, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4">
                  <p className="mb-1 text-sm font-semibold text-[#e5e1e4]">{opp.title}</p>
                  <p className="text-sm leading-relaxed text-[#cbc3d7]">{opp.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
              Risk Analysis
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.03] text-left">
                    <th className="p-3 font-medium text-[#958ea0]">Risk</th>
                    <th className="p-3 font-medium text-[#958ea0]">Level</th>
                    <th className="p-3 font-medium text-[#958ea0]">Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {content.risk_analysis.map((risk) => (
                    <tr key={risk.risk} className="border-b border-white/6 last:border-0">
                      <td className="p-3 font-medium text-[#e5e1e4]">{risk.risk}</td>
                      <td className="p-3 capitalize text-[#cbc3d7]">{risk.level}</td>
                      <td className="p-3 leading-relaxed text-[#cbc3d7]">{risk.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#958ea0]">
              Final Takeaway
            </h2>
            <p className="rounded-xl border border-[#d0bcff]/25 bg-[#d0bcff]/8 p-4 text-sm leading-relaxed text-[#e5e1e4]">
              {content.final_takeaway}
            </p>
          </section>

          <section className="rounded-2xl border border-[#d0bcff]/30 bg-gradient-to-br from-[#d0bcff]/15 to-[#201f22] p-6">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#d0bcff]">
              Have an idea in this space?
            </p>
            <p className="mb-4 text-sm leading-relaxed text-[#cbc3d7]">
              Run your own market pain analysis — grounded in real negative reviews, not guesswork.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                onClick={() => trackLibraryEvent(article.slug, 'cta_signup').catch(() => {})}
                className="landing-primary-glow rounded-lg bg-[#d0bcff] px-4 py-2 text-sm font-semibold text-[#3c0091]"
              >
                Create free account
              </Link>
              <Link
                href="/research/new"
                onClick={() => trackLibraryEvent(article.slug, 'cta_research').catch(() => {})}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/40"
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
