import { createClient } from '@/lib/supabase/server'
import type {
  IdeaOfWeek,
  IdeaOfWeekArchive,
  IdeaOfWeekSummary,
} from '@/lib/api/idea-of-week'
import type { LibraryArticle } from '@/lib/api/library'

type WeeklyRow = Omit<IdeaOfWeek, 'article'> & {
  library_articles: LibraryArticle | LibraryArticle[] | null
}

const DETAIL_SELECT = `
  id,
  week_start,
  week_slug,
  headline,
  dek,
  why_this_week,
  trend_query,
  trend_data,
  selection_score,
  selection_inputs,
  published_at,
  library_articles!inner(
    id,
    slug,
    title,
    category,
    executive_summary,
    content,
    seo,
    market_saturation,
    competition_level,
    products_count,
    reviews_count,
    view_count,
    published_at
  )
`

function toIdea(row: WeeklyRow): IdeaOfWeek | null {
  const article = Array.isArray(row.library_articles)
    ? row.library_articles[0]
    : row.library_articles
  if (!article) return null
  const { library_articles: _relation, ...selection } = row
  return { ...selection, article }
}

export async function getCurrentIdeaOfWeekFromSupabase(): Promise<IdeaOfWeek | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('idea_of_week_selections')
    .select(DETAIL_SELECT)
    .eq('status', 'published')
    .eq('library_articles.status', 'published')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toIdea(data as unknown as WeeklyRow) : null
}

export async function getIdeaOfWeekFromSupabase(week: string): Promise<IdeaOfWeek | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('idea_of_week_selections')
    .select(DETAIL_SELECT)
    .eq('status', 'published')
    .eq('week_slug', week)
    .eq('library_articles.status', 'published')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toIdea(data as unknown as WeeklyRow) : null
}

export async function getIdeaOfWeekArchiveFromSupabase(limit = 24): Promise<IdeaOfWeekArchive> {
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('idea_of_week_selections')
    .select(
      `
        id,
        week_start,
        week_slug,
        headline,
        dek,
        trend_query,
        selection_score,
        published_at,
        library_articles!inner(slug, category)
      `,
      { count: 'exact' },
    )
    .eq('status', 'published')
    .eq('library_articles.status', 'published')
    .order('week_start', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)

  const items: IdeaOfWeekSummary[] = (data ?? []).map((raw) => {
    const relation = raw.library_articles as unknown as
      | { slug: string; category: string }
      | Array<{ slug: string; category: string }>
    const article = Array.isArray(relation) ? relation[0] : relation
    return {
      id: raw.id,
      week_start: raw.week_start,
      week_slug: raw.week_slug,
      headline: raw.headline,
      dek: raw.dek,
      trend_query: raw.trend_query,
      selection_score: raw.selection_score,
      published_at: raw.published_at,
      article_slug: article?.slug ?? '',
      article_category: article?.category ?? '',
    }
  })
  return { items, total: count ?? items.length }
}
