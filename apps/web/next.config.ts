import type { NextConfig } from 'next'
import path from 'node:path'

const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Local `next build` uses .next-build so it doesn't clash with `next dev` cache.
  // Vercel must use default `.next` or the platform fails looking for output.
  ...(process.env.VERCEL
    ? {}
    : { distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next' }),
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiInternalUrl}/api/v1/:path*`,
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
