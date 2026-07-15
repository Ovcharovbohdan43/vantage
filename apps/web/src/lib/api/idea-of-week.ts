import { apiFetch } from '@/lib/api/client'
import { publicApiFetch } from '@/lib/api/public'
import type { LibraryArticle } from '@/lib/api/library'
import type { ShareDraft } from '@/lib/share-report'

export interface WeeklyTrendPoint {
  date: string
  timestamp: number
  value: number
}

export interface WeeklyRelatedQuery {
  query: string
  value: string
  growth?: number | null
}

export interface WeeklyTrendData {
  source: 'serpapi_google_trends' | 'unavailable'
  date_range: string
  geo: string
  points: WeeklyTrendPoint[]
  metrics: {
    current_interest: number
    previous_interest: number
    growth_pct: number
    peak_interest: number
  }
  related_queries: {
    rising: WeeklyRelatedQuery[]
    top: WeeklyRelatedQuery[]
  }
}

export interface IdeaOfWeek {
  id: string
  week_start: string
  week_slug: string
  headline: string
  dek: string
  why_this_week: string
  trend_query: string
  trend_data: WeeklyTrendData
  selection_score: number
  selection_inputs: {
    market_score?: number
    data_confidence?: string
    internal_score?: number
    growing_pain_share?: number
    commercial_opportunity?: number
    candidate_count?: number
    trend_candidate_count?: number
  }
  published_at: string | null
  article: LibraryArticle
}

export interface IdeaOfWeekSummary {
  id: string
  week_start: string
  week_slug: string
  headline: string
  dek: string
  trend_query: string
  selection_score: number
  published_at: string | null
  article_slug: string
  article_category: string
}

export interface IdeaOfWeekArchive {
  items: IdeaOfWeekSummary[]
  total: number
}

export function getCurrentIdeaOfWeek() {
  return publicApiFetch<IdeaOfWeek>('/api/v1/idea-of-week/current', {
    revalidate: 300,
  })
}

export function getIdeaOfWeek(week: string) {
  return publicApiFetch<IdeaOfWeek>(`/api/v1/idea-of-week/${week}`, {
    revalidate: 3600,
  })
}

export function generateIdeaOfWeekShareDraft(week: string, entitlementId: string) {
  return apiFetch<ShareDraft>(`/api/v1/idea-of-week/${week}/share-draft`, {
    method: 'POST',
    body: JSON.stringify({ entitlement_id: entitlementId }),
    cache: 'no-store',
  })
}

export function getIdeaOfWeekArchive(limit = 24) {
  return publicApiFetch<IdeaOfWeekArchive>(`/api/v1/idea-of-week/archive?limit=${limit}`, {
    revalidate: 300,
  })
}
