import type { NextConfig } from 'next'
import path from 'node:path'

/** Keep in sync with `src/lib/api/origin.ts`. */
const PRODUCTION_API_ORIGIN = 'https://vantage-production-83be.up.railway.app'

function resolveApiRewriteDestination(): string | null {
  const raw = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || '').trim()
  const configured =
    raw && /^https?:\/\//i.test(raw) && !raw.includes('cheerful-wisdom')
      ? raw.replace(/\/$/, '')
      : ''
  const base =
    configured || (process.env.VERCEL ? PRODUCTION_API_ORIGIN : 'http://localhost:8000')
  if (!/^https?:\/\//i.test(base)) return null
  return `${base.replace(/\/$/, '')}/api/v1/:path*`
}

const apiRewriteDestination = resolveApiRewriteDestination()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  ...(process.env.VERCEL
    ? {}
    : { distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next' }),
  async rewrites() {
    if (!apiRewriteDestination) return []
    return [
      {
        source: '/api/v1/:path*',
        destination: apiRewriteDestination,
      },
    ]
  },
  experimental: {
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      'recharts',
      'framer-motion',
    ],
  },
}

export default nextConfig
