import 'server-only'

import { getCurrentIdeaOfWeek } from '@/lib/api/idea-of-week'
import type { IdeaOfWeek } from '@/lib/api/idea-of-week'
import { getCurrentIdeaOfWeekFromSupabase } from '@/lib/api/idea-of-week-supabase'

/** Shared Supabase-first loader for the weekly page and landing. */
export async function loadCurrentIdeaOfWeek(): Promise<IdeaOfWeek | null> {
  try {
    const idea = await getCurrentIdeaOfWeekFromSupabase()
    if (idea) return idea
  } catch {
    // The public API remains available if the direct RLS read fails.
  }

  try {
    return await getCurrentIdeaOfWeek()
  } catch {
    return null
  }
}
