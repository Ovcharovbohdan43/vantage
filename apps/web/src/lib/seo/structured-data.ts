import {
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
  libraryArticleUrl,
} from '@/lib/seo/site'

export function organizationJsonLd() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url,
    logo: absoluteUrl('/brand/app-icon-512.png'),
    description: SITE_DESCRIPTION,
    sameAs: [] as string[],
  }
}

export function websiteJsonLd() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    publisher: { '@type': 'Organization', name: SITE_NAME, url },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/library?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: getSiteUrl(),
    description: SITE_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free market teaser preview; paid research credits for full reports',
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function libraryCollectionJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Research Library — Real Customer Pain Analysis',
    description:
      'Browse market research built from real negative software reviews. Customer pain points, saturation signals, and opportunities.',
    url: absoluteUrl('/library'),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: getSiteUrl() },
  }
}

export function normalizeArticleJsonLd(
  existing: Record<string, unknown> | null | undefined,
  opts: {
    slug: string
    title: string
    description: string
    publishedAt?: string | null
  },
) {
  const url = libraryArticleUrl(opts.slug)
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: `${SITE_NAME} Research Library` },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/brand/app-icon-512.png'),
      },
    },
    image: [absoluteUrl('/opengraph-image')],
    ...(opts.publishedAt ? { datePublished: opts.publishedAt, dateModified: opts.publishedAt } : {}),
  }

  if (!existing || typeof existing !== 'object') return base
  return { ...base, ...existing, url, headline: opts.title, description: opts.description }
}
