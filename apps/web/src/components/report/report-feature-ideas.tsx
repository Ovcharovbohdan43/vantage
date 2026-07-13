'use client'

import type { ResearchReport } from '@/lib/api/types'

export function ReportFeatureIdeas({
  report,
  isPreview,
}: {
  report: ResearchReport
  isPreview: boolean
}) {
  const ideas = report.recommendations.feature_ideas ?? []

  if (isPreview) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
          How to beat them
        </h2>
        <div className="rounded-xl border border-white/10 bg-v-surface/80 p-6">
          <p className="text-sm text-v-muted">
            Unlock for concrete feature and service ideas that exploit competitor weaknesses from
            real reviews — not generic advice.
          </p>
        </div>
      </section>
    )
  }

  if (ideas.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-landing-mono text-xs uppercase tracking-widest text-v-muted">
        How to beat them
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-v-muted">
        Specific features and services you can ship to attack the pain clusters above.
      </p>
      <ul className="space-y-4">
        {ideas.map((idea) => (
          <li
            key={idea.feature_name}
            className="rounded-xl border border-white/10 bg-v-surface/60 p-5 md:p-6"
          >
            <p className="text-lg font-semibold tracking-tight text-v-on">{idea.feature_name}</p>
            <p className="mt-1 font-landing-mono text-[11px] tracking-wide text-v-muted">
              Weakness: {idea.pain_addressed}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-v-muted">{idea.how_it_works}</p>
            <p className="mt-3 border-t border-white/8 pt-3 text-sm leading-relaxed text-v-primary/95">
              {idea.why_it_wins}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
