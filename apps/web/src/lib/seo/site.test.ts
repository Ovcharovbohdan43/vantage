import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRODUCTION_SITE_URL, absoluteUrl, getSiteUrl } from '@/lib/seo/site'

describe('seo site helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/')
    expect(getSiteUrl()).toBe('https://example.com')
    expect(absoluteUrl('/library')).toBe('https://example.com/library')
  })

  it('falls back to production domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '')
    vi.stubEnv('VERCEL_URL', '')
    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL)
  })
})
