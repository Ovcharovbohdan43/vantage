import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { getIdeaOfWeekArchive } from '@/lib/api/idea-of-week'
import { getIdeaOfWeekArchiveFromSupabase } from '@/lib/api/idea-of-week-supabase'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Idea of the Week Archive — Vantage',
  description: 'Browse past evidence-backed startup ideas and their weekly demand signals.',
}

async function loadArchive() {
  try {
    return await getIdeaOfWeekArchiveFromSupabase(52)
  } catch {
    try {
      return await getIdeaOfWeekArchive(52)
    } catch {
      return { items: [], total: 0 }
    }
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export default async function IdeaArchivePage() {
  const archive = await loadArchive()
  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-5 md:px-8">
      <header className="border-b border-white/[0.09] pb-7">
        <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
          Weekly releases
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-v-on sm:text-4xl">
          Idea of the Week archive
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-v-muted">
          A permanent record of ideas selected from public market evidence and Google search momentum.
        </p>
      </header>

      <div className="mt-7 overflow-hidden rounded-lg border border-white/[0.09] bg-v-surface">
        {archive.items.length ? (
          <ol>
            {archive.items.map((idea, index) => (
              <li key={idea.id} className="border-b border-white/[0.07] last:border-0">
                <Link
                  href={`/idea-of-the-week/${idea.week_slug}`}
                  className="group grid gap-3 p-5 transition-colors hover:bg-white/[0.025] sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex items-center gap-2 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                    <CalendarDays aria-hidden className="size-3.5" />
                    {formatDate(idea.week_start)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-v-on group-hover:text-v-primary">
                        {idea.headline}
                      </h2>
                      {index === 0 && (
                        <span className="rounded-full border border-v-primary/25 bg-v-primary/[0.06] px-2 py-0.5 font-landing-mono text-[9px] uppercase tracking-wider text-v-primary">
                          latest
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-v-muted">{idea.dek}</p>
                    <p className="mt-2 font-landing-mono text-[9px] uppercase tracking-wider text-v-muted">
                      {idea.article_category} · query: {idea.trend_query}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="font-landing-mono text-xs tabular-nums text-v-muted">
                      {Math.round(idea.selection_score)} score
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 text-v-muted transition-transform group-hover:translate-x-0.5 group-hover:text-v-primary"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-v-muted">No weekly releases have been published yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
