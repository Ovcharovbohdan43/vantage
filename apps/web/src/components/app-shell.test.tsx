import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell, APP_NAV } from '@/components/app-shell'
import { DashboardView } from '@/components/dashboard-view'
import type { CreditsBalance, Project } from '@/lib/api/types'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
let mockPathname = '/dashboard'

const mockSignOut = vi.fn()
const mockGetCredits = vi.fn()
const mockListProjects = vi.fn()
const mockReadPendingPromo = vi.fn(() => null)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

vi.mock('@/lib/api/billing', () => ({
  getCredits: (...args: unknown[]) => mockGetCredits(...args),
  getResearchPacks: vi.fn().mockResolvedValue([]),
  startPackCheckout: vi.fn(),
  readPendingPromo: () => mockReadPendingPromo(),
  clearPendingPromo: vi.fn(),
  redeemPromoCode: vi.fn(),
}))

vi.mock('@/lib/api/projects', () => ({
  listProjects: (...args: unknown[]) => mockListProjects(...args),
}))

const CREDITS: CreditsBalance = {
  free_preview_available: true,
  starter_credits: 0,
  founder_credits: 5,
  indie_credits: 0,
  total_credits: 5,
  depth_credit_costs: { shallow: 1, standard: 2, deep: 3 },
  can_run_preview: true,
  can_run_full: true,
}

function makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'title' | 'status'>): Project {
  return {
    description: 'desc',
    target_audience: null,
    category: 'CRM',
    research_depth: 'shallow',
    sources: ['g2'],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    latest_job: null,
    ...overrides,
  }
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function renderWithQuery(ui: ReactElement) {
  return render(ui, { wrapper: createWrapper() })
}

describe('AppShell navigation and buttons', () => {
  beforeEach(() => {
    mockPathname = '/dashboard'
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSignOut.mockReset().mockResolvedValue({})
    mockGetCredits.mockReset().mockResolvedValue(CREDITS)
    mockReadPendingPromo.mockReturnValue(null)
  })

  it('exposes all primary nav destinations', async () => {
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    for (const item of APP_NAV) {
      const matches = screen.getAllByRole('link', { name: item.label })
      expect(matches.length).toBeGreaterThan(0)
      for (const link of matches) {
        expect(link).toHaveAttribute('href', item.href)
      }
    }
  })

  it('routes logo, account, and New research CTAs correctly', async () => {
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    const brandLinks = screen.getAllByRole('link', { name: /Vantage/i })
    expect(brandLinks.every((l) => l.getAttribute('href') === '/dashboard')).toBe(true)

    const accountLinks = screen.getAllByRole('link', { name: /founder@example.com/i })
    expect(accountLinks.every((l) => l.getAttribute('href') === '/account')).toBe(true)

    const newLinks = screen.getAllByRole('link', { name: /New research|New/i })
    expect(newLinks.some((l) => l.getAttribute('href') === '/research/new')).toBe(true)
  })

  it('marks active nav item with aria-current', async () => {
    mockPathname = '/research/new'
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    const active = screen.getAllByRole('link', { name: 'New research' })
    expect(active.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('signs out and redirects to login', async () => {
    const user = userEvent.setup()
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    const signOutButtons = screen.getAllByRole('button', { name: 'Sign out' })
    await user.click(signOutButtons[0]!)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('opens and closes the mobile menu', async () => {
    const user = userEvent.setup()
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getAllByRole('button', { name: 'Close menu' }).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: 'Close menu' })[0]!)
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument()
  })

  it('submits library search from the header', async () => {
    const user = userEvent.setup()
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    const search = screen.getByRole('searchbox', { name: 'Search research library' })
    await user.type(search, 'shopify inventory')
    await user.keyboard('{Enter}')

    expect(mockPush).toHaveBeenCalledWith('/library?q=shopify%20inventory')
  })

  it('ensures every shell link has a non-empty href', async () => {
    renderWithQuery(
      <AppShell userEmail="founder@example.com">
        <div>content</div>
      </AppShell>,
    )

    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href')
      expect(href, `link "${link.textContent}"`).toBeTruthy()
      expect(href).not.toBe('#')
    }
  })
})

describe('DashboardView buttons and links', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockGetCredits.mockReset().mockResolvedValue(CREDITS)
    mockListProjects.mockReset()
  })

  it('empty state: New research CTAs point to /research/new', async () => {
    mockListProjects.mockResolvedValue({ items: [], total: 0 })
    renderWithQuery(<DashboardView />)

    await waitFor(() => expect(screen.getByText(/Start your first market analysis/i)).toBeInTheDocument())

    const ctas = screen.getAllByRole('link', { name: 'New research' })
    expect(ctas.length).toBeGreaterThanOrEqual(2)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/research/new')
    }
  })

  it('filter tabs switch visible rows', async () => {
    const user = userEvent.setup()
    mockListProjects.mockResolvedValue({
      items: [
        makeProject({
          id: 'p1',
          title: 'CRM sync pains',
          status: 'completed',
          latest_job: {
            id: 'j1',
            status: 'completed',
            stage: 'completed',
            progress_pct: 100,
            stats: { competitors_found: 3, reviews_collected: 120, pain_clusters_found: 8 },
            error: null,
            started_at: null,
            completed_at: null,
            created_at: '2026-06-01T00:00:00Z',
          },
        }),
        makeProject({
          id: 'p2',
          title: 'Inventory runner',
          status: 'running',
          latest_job: {
            id: 'j2',
            status: 'running',
            stage: 'collecting_reviews',
            progress_pct: 40,
            stats: { competitors_found: 2, reviews_collected: 10, pain_clusters_found: 0 },
            error: null,
            started_at: null,
            completed_at: null,
            created_at: '2026-06-02T00:00:00Z',
          },
        }),
        makeProject({ id: 'p3', title: 'Failed scrape', status: 'failed' }),
      ],
      total: 3,
    })

    renderWithQuery(<DashboardView />)

    expect(await screen.findByText('CRM sync pains')).toBeInTheDocument()
    expect(screen.getByText('Inventory runner')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Running/i }))
    expect(screen.getByText('Inventory runner')).toBeInTheDocument()
    expect(screen.queryByText('CRM sync pains')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Failed/i }))
    expect(screen.getByText('Failed scrape')).toBeInTheDocument()
    expect(screen.queryByText('Inventory runner')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Completed/i }))
    expect(screen.getByText('CRM sync pains')).toBeInTheDocument()
  })

  it('routes completed rows to report and running rows to progress', async () => {
    mockListProjects.mockResolvedValue({
      items: [
        makeProject({
          id: 'done-1',
          title: 'Done project',
          status: 'completed',
          latest_job: {
            id: 'j1',
            status: 'completed',
            stage: 'completed',
            progress_pct: 100,
            stats: { competitors_found: 1, reviews_collected: 50, pain_clusters_found: 4 },
            error: null,
            started_at: null,
            completed_at: null,
            created_at: '2026-06-01T00:00:00Z',
          },
        }),
        makeProject({
          id: 'run-1',
          title: 'Live project',
          status: 'running',
          latest_job: {
            id: 'j2',
            status: 'running',
            stage: 'analyzing',
            progress_pct: 55,
            stats: { competitors_found: 2, reviews_collected: 20, pain_clusters_found: 1 },
            error: null,
            started_at: null,
            completed_at: null,
            created_at: '2026-06-02T00:00:00Z',
          },
        }),
      ],
      total: 2,
    })

    renderWithQuery(<DashboardView />)

    const done = await screen.findByRole('link', { name: /Done project/i })
    expect(done).toHaveAttribute('href', '/research/done-1/report')

    const live = screen.getByRole('link', { name: /Live project/i })
    expect(live).toHaveAttribute('href', '/research/run-1')
  })

  it('header New research stays available when projects exist', async () => {
    mockListProjects.mockResolvedValue({
      items: [makeProject({ id: 'p1', title: 'Only one', status: 'completed' })],
      total: 1,
    })

    renderWithQuery(<DashboardView />)

    const headerCta = await screen.findByRole('link', { name: 'New research' })
    expect(headerCta).toHaveAttribute('href', '/research/new')
  })

  it('shows empty-filter message without losing filter tabs', async () => {
    const user = userEvent.setup()
    mockListProjects.mockResolvedValue({
      items: [makeProject({ id: 'p1', title: 'Only completed', status: 'completed' })],
      total: 1,
    })

    renderWithQuery(<DashboardView />)
    await screen.findByText('Only completed')

    await user.click(screen.getByRole('tab', { name: /Failed/i }))
    expect(screen.getByText(/No analyses match this filter/i)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument()
  })
})
