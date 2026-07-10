import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/landing-page'
import { listLibraryArticles } from '@/lib/api/library'
import { publicApiFetch } from '@/lib/api/public'
import type { ResearchPackInfo } from '@/lib/api/types'
import { createClient } from '@/lib/supabase/server'

const FALLBACK_PACKS: ResearchPackInfo[] = [
  {
    id: 'starter',
    label: 'Starter Research',
    price_usd: 9,
    credits: 1,
    tagline: 'Your first full report — prove the tool works',
  },
  {
    id: 'founder',
    label: 'Founder Pack',
    price_usd: 29,
    credits: 5,
    tagline: 'Compare multiple ideas before you commit months of work',
  },
  {
    id: 'indie',
    label: 'Indie Hacker',
    price_usd: 79,
    credits: 20,
    tagline: 'For builders who validate ideas constantly',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  let featuredArticles: Awaited<ReturnType<typeof listLibraryArticles>>['items'] = []
  let packs: ResearchPackInfo[] = FALLBACK_PACKS

  try {
    const [library, packList] = await Promise.all([
      listLibraryArticles({ limit: 3, sort: 'latest' }),
      publicApiFetch<ResearchPackInfo[]>('/api/v1/billing/packs', { cache: 'no-store' }),
    ])
    featuredArticles = library.items
    packs = packList
  } catch {
    try {
      const library = await listLibraryArticles({ limit: 3, sort: 'latest' })
      featuredArticles = library.items
    } catch {
      // API unavailable during local setup
    }
  }

  return <LandingPage featuredArticles={featuredArticles} packs={packs} />
}
