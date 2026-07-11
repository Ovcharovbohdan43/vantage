/** Production Railway API origin. Used when Vercel env is missing so library SSR works. */
export const PRODUCTION_API_ORIGIN = 'https://vantage-production-83be.up.railway.app'

export function resolveApiOrigin(options?: { forClientProxy?: boolean }): string {
  const configured =
    process.env.API_INTERNAL_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || ''

  if (typeof window === 'undefined') {
    if (configured) return configured.replace(/\/$/, '')
    if (process.env.VERCEL) return PRODUCTION_API_ORIGIN
    return 'http://localhost:8000'
  }

  // Browser: prefer same-origin rewrite proxy when enabled.
  if (options?.forClientProxy !== false && process.env.NEXT_PUBLIC_API_PROXY === '1') {
    return ''
  }

  if (configured) return configured.replace(/\/$/, '')
  if (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL) return PRODUCTION_API_ORIGIN
  return 'http://localhost:8000'
}
