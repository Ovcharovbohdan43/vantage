import type { MetadataRoute } from 'next'
import { absoluteUrl, getSiteUrl } from '@/lib/seo/site'

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/library', '/library/'],
        disallow: [
          '/dashboard',
          '/research',
          '/account',
          '/billing',
          '/support',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/auth/',
          '/api/',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/library', '/library/'],
        disallow: ['/dashboard', '/research', '/account', '/billing', '/api/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/library', '/library/'],
        disallow: ['/dashboard', '/research', '/account', '/billing', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: site.replace(/^https?:\/\//i, ''),
  }
}
