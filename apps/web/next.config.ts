import type { NextConfig } from 'next'
import path from 'node:path'

/** Keep in sync with `src/lib/api/origin.ts` — next.config cannot import app modules reliably. */
const PRODUCTION_API_ORIGIN = 'https://vantage-production-83be.up.railway.app'

function resolveApiRewriteDestination(): string | null {
  const raw = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || '').trim()
  const base = raw || (process.env.VERCEL ? PRODUCTION_API_ORIGIN : 'http://localhost:8000')
  if (!base) return null
  if (!/^https?:\/\//i.test(base)) return null
  return `${base.replace(/\/$/, '')}/api/v1/:path*`
}

const apiRewriteDestination = resolveApiRewriteDestination()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Local `next build` uses .next-build so it doesn't clash with `next dev` cache.
  // Vercel must use default `.next` or the platform fails looking for output.
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
    // Tree-shake heavy barrel imports so dev compiles far fewer modules
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      'recharts',
      'framer-motion',
    ],
  },
}

export default nextConfig
