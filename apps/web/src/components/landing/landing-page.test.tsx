import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { LibraryArticleSummary } from '@/lib/api/library'
import type { ResearchPackInfo } from '@/lib/api/types'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingPage } from '@/components/landing/landing-page'

const PACKS: ResearchPackInfo[] = [
  {
    id: 'starter',
    label: 'Starter Research',
    price_usd: 5,
    credits: 1,
    tagline: 'Your first full report — prove the tool works',
  },
  {
    id: 'founder',
    label: 'Founder Pack',
    price_usd: 25,
    credits: 5,
    tagline: 'Compare multiple ideas before you commit months of work',
  },
  {
    id: 'indie',
    label: 'Indie Hacker',
    price_usd: 100,
    credits: 20,
    tagline: 'For builders who validate ideas constantly',
  },
]

const ARTICLES: LibraryArticleSummary[] = [
  {
    id: 'a1',
    slug: 'shopify-inventory-pains',
    title: 'Shopify inventory sync pains',
    category: 'E-commerce',
    executive_summary: 'Inventory sync failures dominate Shopify complaints.',
    products_count: 12,
    reviews_count: 840,
    market_saturation: 'High',
    competition_level: 'High',
    view_count: 120,
    published_at: '2026-06-01T00:00:00Z',
  },
]

function renderLanding(overrides?: {
  featuredArticles?: LibraryArticleSummary[]
  packs?: ResearchPackInfo[]
}) {
  return render(
    <LandingPage
      featuredArticles={overrides?.featuredArticles ?? ARTICLES}
      packs={overrides?.packs ?? PACKS}
    />,
  )
}

/** Assert every matching link shares the same href (desktop + mobile duplicates). */
function expectAllHrefs(name: string | RegExp, href: string) {
  const links = screen.getAllByRole('link', { name })
  expect(links.length).toBeGreaterThan(0)
  for (const link of links) {
    expect(link).toHaveAttribute('href', href)
  }
}

describe('LandingHeader buttons', () => {
  it('exposes primary nav links with correct destinations', () => {
    render(<LandingHeader />)

    expectAllHrefs('Vantage', '/')
    expectAllHrefs('Library', '/library')
    expectAllHrefs('Method', '#method')
    expectAllHrefs('Report', '#report')
    expectAllHrefs('Pricing', '#pricing')
    expectAllHrefs('Log in', '/login')
    expectAllHrefs('Sign up', '/signup')
  })

  it('opens and closes the mobile menu and keeps destinations intact', async () => {
    const user = userEvent.setup()
    render(<LandingHeader />)

    const open = screen.getByRole('button', { name: 'Open menu' })
    expect(open).toHaveAttribute('aria-expanded', 'false')

    await user.click(open)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining(['/library', '#method', '#report', '#pricing', '/login', '/signup']),
    )

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('closes mobile menu when a drawer link is activated', async () => {
    const user = userEvent.setup()
    render(<LandingHeader />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    // Desktop + drawer both render Pricing; drawer is second and wires onClick to close.
    const pricingLinks = within(screen.getByRole('banner')).getAllByRole('link', {
      name: 'Pricing',
    })
    expect(pricingLinks.length).toBeGreaterThanOrEqual(2)
    await user.click(pricingLinks[1]!)

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})

describe('LandingPage CTAs and links', () => {
  it('routes hero and section jump CTAs correctly', () => {
    renderLanding()

    expectAllHrefs('Create free account', '/signup')
    expectAllHrefs('Start free preview', '/signup')
    expectAllHrefs('Browse library', '/library')
    expectAllHrefs('0.1 Method', '#method')
    expectAllHrefs('5.0 Pricing', '#pricing')
    expect(screen.getByText('1 full report free')).toBeInTheDocument()
    expect(screen.getByText('included on signup · no card')).toBeInTheDocument()
  })

  it('routes pricing pack buttons to signup', () => {
    renderLanding()

    expectAllHrefs('Choose Starter', '/signup')
    expectAllHrefs('Get Founder Pack', '/signup')
    expectAllHrefs('Choose Indie', '/signup')
  })

  it('marks Founder Pack as recommended and keeps other packs selectable', () => {
    renderLanding()

    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('$5')).toBeInTheDocument()
    expect(screen.getByText('$25')).toBeInTheDocument()
    expect(screen.getByText('$100')).toBeInTheDocument()
    expect(screen.getAllByText('One-time payment · $5 per report')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Get Founder Pack' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Choose Starter' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Choose Indie' })).toBeVisible()
  })

  it('routes bottom CTA bar correctly', () => {
    renderLanding()

    expectAllHrefs('Start free preview', '/signup')
    expectAllHrefs('Contact support', '/support')
  })

  it('routes library article cards and view-all link', () => {
    renderLanding()

    expectAllHrefs('View all', '/library')
    expectAllHrefs(/Shopify inventory sync pains/i, '/library/shopify-inventory-pains')
  })

  it('hides library section when there are no articles', () => {
    renderLanding({ featuredArticles: [] })

    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Public market research/i)).not.toBeInTheDocument()
  })

  it('routes footer account and product links', () => {
    renderLanding()

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Method' })).toHaveAttribute('href', '#method')
    expect(within(footer).getByRole('link', { name: 'Report' })).toHaveAttribute('href', '#report')
    expect(within(footer).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '#pricing')
    expect(within(footer).getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library')
    expect(within(footer).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(within(footer).getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
    expect(within(footer).getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support')
    expect(within(footer).getByRole('link', { name: 'Research library' })).toHaveAttribute(
      'href',
      '/library',
    )
  })

  it('keeps quote-section research-library CTA working', () => {
    renderLanding()

    expectAllHrefs('Research library', '/library')
  })

  it('ensures every interactive CTA is an anchor with a non-empty href', () => {
    renderLanding()

    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(10)

    for (const link of links) {
      const href = link.getAttribute('href')
      expect(href, `link "${link.textContent}" missing href`).toBeTruthy()
      expect(href).not.toBe('#')
      expect(href!.length).toBeGreaterThan(0)
    }
  })

  it('only uses signup for purchase CTAs (no dead buy endpoints)', () => {
    renderLanding()

    const purchaseNames = [
      /Choose Starter/i,
      /Get Founder Pack/i,
      /Choose Indie/i,
      /Create free account/i,
      /Start free preview/i,
    ]
    for (const name of purchaseNames) {
      const matches = screen.getAllByRole('link', { name })
      for (const link of matches) {
        expect(link).toHaveAttribute('href', '/signup')
      }
    }
  })
})
