import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { IdeaOfWeekView } from '@/components/idea-of-week/idea-of-week-view'
import { loadCurrentIdeaOfWeek } from '@/lib/api/idea-of-week-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Idea of the Week — Vantage',
  description: 'A weekly evidence-backed startup idea selected from market research and Google Trends.',
}

export default async function IdeaOfTheWeekPage() {
  const idea = await loadCurrentIdeaOfWeek()
  if (idea) return <IdeaOfWeekView idea={idea} />

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-16 text-center">
      <div className="w-full rounded-lg border border-white/[0.09] bg-v-surface p-8">
        <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
          Idea of the Week
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-v-on">The next pick is brewing.</h1>
        <p className="mt-3 text-sm leading-relaxed text-v-muted">
          New evidence-backed ideas are published every Monday at 00:00 UTC.
        </p>
        <Link
          href="/library"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-v-primary hover:underline"
        >
          Browse Research Library
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  )
}
