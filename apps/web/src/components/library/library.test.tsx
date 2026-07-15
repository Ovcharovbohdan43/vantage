import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LibraryArticleCard } from '@/components/library/library-article-card'
import { LibraryArticleView } from '@/components/library/library-article-view'
import { LibraryHeader } from '@/components/library/library-header'
import { LibraryIndexClient } from '@/components/library/library-index-client'
import type { LibraryArticle, LibraryArticleSummary } from '@/lib/api/library'

const mockPush = vi.fn()
const mockTrack = vi.fn().mockResolvedValue(undefined)
const mockGetReviews = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/api/library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/library')>()
  return {
    ...actual,
    trackLibraryEvent: (...args: unknown[]) => mockTrack(...args),
  }
})

vi.mock('@/lib/api/library-browser', () => ({
  getLibraryReviewsFromBrowser: (...args: unknown[]) => mockGetReviews(...args),
}))

const ARTICLE_SUMMARY: LibraryArticleSummary = {
  id: 'a1',
  slug: 'shopify-inventory-pains',
  title: 'Shopify inventory sync pains',
  category: 'E-commerce',
  executive_summary: 'Inventory sync failures dominate Shopify complaints.',
  market_saturation: 'HIGH',
  competition_level: 'High',
  products_count: 12,
  reviews_count: 840,
  view_count: 120,
  published_at: '2026-06-01T00:00:00Z',
}

const FULL_ARTICLE: LibraryArticle = {
  ...ARTICLE_SUMMARY,
  content: {
    dataset: {
      products_analyzed: 12,
      reviews_analyzed: 840,
      sources: ['G2', 'Capterra'],
      rating_range: '1-3',
    },
    market_saturation: {
      level: 'HIGH',
      competition_level: 'High',
      explanation: 'Many incumbents already cover inventory sync.',
    },
    pain_points: [
      {
        cluster_id: 'c1',
        title: 'Sync delays',
        frequency: 120,
        severity_score: 8.2,
        explanation: 'Orders sell out of stock items.',
        why_critical: 'Direct revenue loss.',
        quotes: [
          {
            text: 'Inventory is always wrong overnight.',
            rating: 1,
            source: 'g2',
            product: 'Shopify',
          },
        ],
        supporting_review_ids: ['r1'],
      },
    ],
    market_opportunities: [
      { title: 'Real-time sync layer', body: 'Founders want sub-minute accuracy.' },
    ],
    risk_analysis: [
      { risk: 'Platform lock-in', level: 'medium', explanation: 'Shopify APIs change often.' },
    ],
    final_takeaway: 'Pain is real but competition is dense — niche hard.',
  },
  seo: {
    title: 'Shopify inventory',
    description: 'desc',
    slug: 'shopify-inventory-pains',
    canonical_url: 'https://example.com/library/shopify-inventory-pains',
    og_title: 'Shopify inventory',
    og_description: 'desc',
    twitter_card: 'summary',
    json_ld: {},
  },
}

describe('LibraryHeader links', () => {
  it('routes brand, browse, login, and signup CTAs', () => {
    render(<LibraryHeader />)

    expect(screen.getByRole('link', { name: /Vantage/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/library')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /Validate your idea|Sign up/i })).toHaveAttribute(
      'href',
      '/signup',
    )
  })
})

describe('LibraryArticleCard', () => {
  it('links to the article slug', () => {
    render(<LibraryArticleCard article={ARTICLE_SUMMARY} />)
    expect(
      screen.getByRole('link', { name: /Shopify inventory sync pains/i }),
    ).toHaveAttribute('href', '/library/shopify-inventory-pains')
  })
})

describe('LibraryIndexClient filters and buttons', () => {
  beforeEach(() => {
    mockPush.mockReset()
  })

  it('submits search with filters', async () => {
    const user = userEvent.setup()
    render(
      <LibraryIndexClient
        items={[ARTICLE_SUMMARY]}
        total={1}
        categories={['E-commerce', 'CRM']}
        filters={{ q: '', category: '', saturation: '', sort: 'latest' }}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search research' }), 'inventory')
    await user.click(screen.getByRole('button', { name: /Filters/i }))
    const dialog = screen.getByRole('dialog', { name: 'Filters' })
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'E-commerce')
    await user.click(within(dialog).getByRole('button', { name: 'Apply filters' }))

    expect(mockPush).toHaveBeenCalled()
    const url = String(mockPush.mock.calls[0]![0])
    expect(url).toContain('/library?')
    expect(url).toContain('q=inventory')
    expect(url).toContain('category=E-commerce')
  })

  it('Clear resets filters and navigates to /library', async () => {
    const user = userEvent.setup()
    render(
      <LibraryIndexClient
        items={[]}
        total={0}
        categories={['CRM']}
        filters={{ q: 'foo', category: 'CRM', saturation: 'HIGH', sort: 'popular' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Clear$/ }))
    expect(mockPush).toHaveBeenCalledWith('/library')
  })

  it('renders article rows as links', () => {
    render(
      <LibraryIndexClient
        items={[ARTICLE_SUMMARY]}
        total={1}
        categories={[]}
        filters={{ q: '', category: '', saturation: '', sort: 'latest' }}
      />,
    )

    expect(screen.getByRole('link', { name: /Shopify inventory sync pains/i })).toHaveAttribute(
      'href',
      '/library/shopify-inventory-pains',
    )
  })
})

describe('LibraryArticleView tabs and CTAs', () => {
  beforeEach(() => {
    mockTrack.mockClear()
    mockGetReviews.mockReset().mockResolvedValue({ items: [], total: 0 })
  })

  it('tracks view and exposes research CTAs', async () => {
    render(<LibraryArticleView article={FULL_ARTICLE} />)

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('shopify-inventory-pains', 'view')
    })

    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute(
      'href',
      '/signup',
    )
    expect(screen.getByRole('link', { name: 'Start research' })).toHaveAttribute(
      'href',
      '/research/new',
    )
  })

  it('switches to Evidence via tab and View evidence button', async () => {
    const user = userEvent.setup()
    render(<LibraryArticleView article={FULL_ARTICLE} />)

    await user.click(screen.getByRole('tab', { name: 'Evidence' }))
    await waitFor(() => expect(mockGetReviews).toHaveBeenCalled())
    expect(screen.getByText(/Every negative review collected/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Research' }))
    await user.click(screen.getByRole('button', { name: 'View evidence' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true'))
  })

  it('fires CTA tracking on signup click', async () => {
    const user = userEvent.setup()
    render(<LibraryArticleView article={FULL_ARTICLE} />)

    await user.click(screen.getByRole('link', { name: 'Create free account' }))
    expect(mockTrack).toHaveBeenCalledWith('shopify-inventory-pains', 'cta_signup')
  })
})

describe('Library interactive inventory', () => {
  it('header links all have real hrefs', () => {
    render(<LibraryHeader />)
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).not.toBe('#')
    }
  })

  it('article research tab panel exposes expected actions', () => {
    render(<LibraryArticleView article={FULL_ARTICLE} />)
    const research = screen.getByRole('tab', { name: 'Research' })
    expect(research).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'View evidence' })).toBeInTheDocument()
    expect(within(screen.getByRole('article')).getAllByRole('link').length).toBeGreaterThanOrEqual(2)
  })
})
