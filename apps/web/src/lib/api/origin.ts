/** Live Railway API for Vantage production. */
export const PRODUCTION_API_ORIGIN = 'https://vantage-production-83be.up.railway.app'

function configuredOrigin(): string {
  return (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '')
}

function isUsableApiOrigin(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false
  // Known dead Railway service that was briefly linked from Vercel env.
  if (url.includes('cheerful-wisdom')) return false
  return true
}

export function resolveApiOrigin(): string {
  const configured = configuredOrigin()

  if (typeof window === 'undefined') {
    // On Vercel, never fall back to localhost — that renders an empty Research Library.
    if (process.env.VERCEL) {
      return isUsableApiOrigin(configured) ? configured : PRODUCTION_API_ORIGIN
    }
    return isUsableApiOrigin(configured) ? configured : 'http://localhost:8000'
  }

  // Browser: same-origin rewrite proxy when enabled (needs next.config rewrites).
  if (process.env.NEXT_PUBLIC_API_PROXY === '1') {
    return ''
  }

  if (isUsableApiOrigin(configured)) return configured
  if (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL) return PRODUCTION_API_ORIGIN
  return 'http://localhost:8000'
}
