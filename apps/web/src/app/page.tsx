import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/json-ld'
import { LandingPage } from '@/components/landing/landing-page'
import { listLibraryArticles } from '@/lib/api/library'
import { publicApiFetch } from '@/lib/api/public'
import type { ResearchPackInfo } from '@/lib/api/types'
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from '@/lib/seo/structured-data'
import { SITE_DEFAULT_TITLE, SITE_DESCRIPTION, absoluteUrl } from '@/lib/seo/site'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: { absolute: SITE_DEFAULT_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    type: 'website',
  },
}

const FALLBACK_PACKS: ResearchPackInfo[] = [
  {
    id: 'starter',
    label: 'Starter Research',
    price_usd: 5,
    credits: 1,
    tagline: 'Your first full report — prove the tool works',
  },
  {
    id: 'founder',
    label: 'Founder Pack',
    price_usd: 25,
    credits: 5,
    tagline: 'Compare multiple ideas before you commit months of work',
  },
  {
    id: 'indie',
    label: 'Indie Hacker',
    price_usd: 100,
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

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd()} />
      <LandingPage featuredArticles={featuredArticles} packs={packs} />
    </>
  )
}
