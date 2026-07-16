import type { MetadataRoute } from 'next'
import { absoluteUrl, getSiteUrl } from '@/lib/seo/site'

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/library', '/library/', '/blog', '/blog/'],
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
          '/blog/new',
          '/blog/*/edit',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/library', '/library/', '/blog', '/blog/'],
        disallow: ['/dashboard', '/research', '/account', '/billing', '/api/', '/blog/new'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/library', '/library/', '/blog', '/blog/'],
        disallow: ['/dashboard', '/research', '/account', '/billing', '/api/', '/blog/new'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: site.replace(/^https?:\/\//i, ''),
  }
}
