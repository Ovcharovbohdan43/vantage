'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackLibraryEvent } from '@/lib/api/library'
import type { LibraryArticle, LibraryPainPoint } from '@/lib/api/library'
import { LibraryEvidence } from '@/components/library/library-evidence'

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-600 text-xs font-mono" aria-label={`${rating} stars`}>
      {'★'.repeat(rating)}
      <span className="text-zinc-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
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
          className={`text-xs font-mono uppercase tracking-widest px-3 py-1.5 border ${
            tab === 'research' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 text-zinc-500'
          }`}
        >
          Research
        </button>
        <button
          type="button"
          onClick={() => setTab('evidence')}
          className={`text-xs font-mono uppercase tracking-widest px-3 py-1.5 border ${
            tab === 'evidence' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 text-zinc-500'
          }`}
        >
          Evidence
        </button>
      </div>

      {tab === 'evidence' ? (
        <LibraryEvidence slug={article.slug} initialClusterId={supportClusterId} />
      ) : (
        <div className="space-y-10">
          <header>
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">
              {article.category}
            </p>
            <h1 className="text-2xl font-semibold text-zinc-950 leading-tight mb-4">{article.title}</h1>
            <p className="text-sm text-zinc-600 leading-relaxed">{article.executive_summary}</p>
          </header>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Dataset</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm border border-zinc-200 p-4">
              <div>
                <dt className="text-zinc-400 text-xs mb-0.5">Products analyzed</dt>
                <dd className="font-semibold tabular-nums">{dataset.products_analyzed}</dd>
              </div>
              <div>
                <dt className="text-zinc-400 text-xs mb-0.5">Reviews analyzed</dt>
                <dd className="font-semibold tabular-nums">{dataset.reviews_analyzed}</dd>
              </div>
              <div>
                <dt className="text-zinc-400 text-xs mb-0.5">Source</dt>
                <dd className="font-medium">{dataset.sources.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-zinc-400 text-xs mb-0.5">Ratings analyzed</dt>
                <dd className="font-medium">★1–★3</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">
              Market Saturation
            </h2>
            <div className="border border-zinc-200 p-4">
              <p className="text-sm font-semibold text-zinc-950 mb-1">
                {content.market_saturation.level} · {content.market_saturation.competition_level} competition
              </p>
              <p className="text-sm text-zinc-600 leading-relaxed">
                {content.market_saturation.explanation}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4">
              Top Customer Pain Points
            </h2>
            <div className="space-y-4">
              {content.pain_points.map((pain: LibraryPainPoint) => (
                <div key={pain.cluster_id} className="border border-zinc-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-zinc-950">{pain.title}</h3>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      {pain.frequency} mentions · severity {pain.severity_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-2">{pain.explanation}</p>
                  <p className="text-xs text-zinc-500 mb-4">{pain.why_critical}</p>
                  <div className="space-y-3 mb-4">
                    {pain.quotes.map((quote, i) => (
                      <blockquote key={i} className="border-l-2 border-zinc-200 pl-3">
                        <div className="mb-1">
                          <StarRating rating={quote.rating} />
                        </div>
                        <p className="text-sm text-zinc-800 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
                        <p className="text-[10px] font-mono text-zinc-400 mt-1 uppercase">
                          {quote.product} · {quote.source.toUpperCase()}
                        </p>
                      </blockquote>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openSupportingReviews(pain.cluster_id)}
                    className="text-xs font-medium text-zinc-950 underline underline-offset-2 hover:text-zinc-600"
                  >
                    View evidence
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">
              Market Opportunities
            </h2>
            <div className="space-y-3">
              {content.market_opportunities.map((opp, i) => (
                <div key={i} className="border border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-950 mb-1">{opp.title}</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{opp.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Risk Analysis</h2>
            <div className="overflow-x-auto border border-zinc-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                    <th className="p-3 font-medium text-zinc-500">Risk</th>
                    <th className="p-3 font-medium text-zinc-500">Level</th>
                    <th className="p-3 font-medium text-zinc-500">Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {content.risk_analysis.map((risk) => (
                    <tr key={risk.risk} className="border-b border-zinc-100 last:border-0">
                      <td className="p-3 font-medium text-zinc-950">{risk.risk}</td>
                      <td className="p-3 capitalize text-zinc-600">{risk.level}</td>
                      <td className="p-3 text-zinc-600 leading-relaxed">{risk.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Final Takeaway</h2>
            <p className="text-sm text-zinc-700 leading-relaxed border border-zinc-200 p-4 bg-zinc-50">
              {content.final_takeaway}
            </p>
          </section>

          <section className="border border-zinc-950 bg-zinc-950 text-white p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">
              Have an idea in this space?
            </p>
            <p className="text-sm text-zinc-200 mb-4 leading-relaxed">
              Run your own market pain analysis — grounded in real negative reviews, not guesswork.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                onClick={() => trackLibraryEvent(article.slug, 'cta_signup').catch(() => {})}
                className="text-sm font-medium bg-white text-zinc-950 px-4 py-2 hover:bg-zinc-100 transition-colors"
              >
                Create free account
              </Link>
              <Link
                href="/research/new"
                onClick={() => trackLibraryEvent(article.slug, 'cta_research').catch(() => {})}
                className="text-sm font-medium border border-zinc-600 text-white px-4 py-2 hover:border-zinc-400 transition-colors"
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
