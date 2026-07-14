/**
 * Canonical site identity for metadata, sitemap, robots, and JSON-LD.
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://vantageserch.app).
 */
export const SITE_NAME = 'Vantage'
export const SITE_TAGLINE = 'Find out if your idea is worth building'
export const SITE_DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`
export const SITE_DESCRIPTION =
  'Validate startup ideas with real negative reviews from G2 and Capterra. Market pain research with evidence, quotes, and a clear build / pivot / don’t-build verdict.'
export const SITE_KEYWORDS = [
  'startup idea validation',
  'market research',
  'G2 reviews analysis',
  'Capterra reviews',
  'customer pain points',
  'competitive analysis',
  'product discovery',
  'founder research',
  'SaaS market validation',
] as const

/** Production fallback — matches email / API defaults. */
export const PRODUCTION_SITE_URL = 'https://vantageserch.app'

export function getSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv

  const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim().replace(/\/$/, '')
  if (vercelProd) {
    return vercelProd.startsWith('http') ? vercelProd : `https://${vercelProd}`
  }

  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/\/$/, '')
    return host.startsWith('http') ? host : `https://${host}`
  }

  return PRODUCTION_SITE_URL
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function libraryArticleUrl(slug: string): string {
  return absoluteUrl(`/library/${slug}`)
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`)
}
