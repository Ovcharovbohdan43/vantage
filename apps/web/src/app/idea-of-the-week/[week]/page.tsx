import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { IdeaOfWeekView } from '@/components/idea-of-week/idea-of-week-view'
import { getIdeaOfWeek } from '@/lib/api/idea-of-week'
import { getIdeaOfWeekFromSupabase } from '@/lib/api/idea-of-week-supabase'

export const dynamic = 'force-dynamic'

async function loadIdea(week: string) {
  try {
    const idea = await getIdeaOfWeekFromSupabase(week)
    if (idea) return idea
  } catch {
    // Use API fallback when Supabase cannot serve the public RLS read.
  }
  try {
    return await getIdeaOfWeek(week)
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>
}): Promise<Metadata> {
  const { week } = await params
  const idea = await loadIdea(week)
  if (!idea) return { title: 'Weekly idea not found — Vantage' }
  return {
    title: `${idea.headline} — Vantage`,
    description: idea.dek,
    alternates: { canonical: `/idea-of-the-week/${idea.week_slug}` },
  }
}

export default async function WeeklyIdeaPage({
  params,
}: {
  params: Promise<{ week: string }>
}) {
  const { week } = await params
  const idea = await loadIdea(week)
  if (!idea) notFound()
  return <IdeaOfWeekView idea={idea} />
}
