import type { NextConfig } from 'next'
import path from 'node:path'

const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Keep production builds out of the dev `.next` dir to avoid cache corruption
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
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
