import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisTheater } from '@/components/analysis-theater'
import { NewResearchForm } from '@/components/new-research-form'
import { ReportView } from '@/components/report-view'
import { ResearchProgressView } from '@/components/research-progress-view'
import type { CreditsBalance, ResearchReport } from '@/lib/api/types'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockCreateProject = vi.fn()
const mockGetCredits = vi.fn()
const mockGetProjectStatus = vi.fn()
const mockListCompetitors = vi.fn()
const mockCancelProject = vi.fn()
const mockRetryProject = vi.fn()
const mockGetProjectReport = vi.fn()
const mockDownloadReport = vi.fn()
const mockGetFeedbackStatus = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock('@/lib/api/projects', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  getProjectStatus: (...args: unknown[]) => mockGetProjectStatus(...args),
  cancelProject: (...args: unknown[]) => mockCancelProject(...args),
  retryProject: (...args: unknown[]) => mockRetryProject(...args),
}))

vi.mock('@/lib/api/billing', () => ({
  getCredits: (...args: unknown[]) => mockGetCredits(...args),
  getResearchPacks: vi.fn().mockResolvedValue([]),
  startPackCheckout: vi.fn(),
  unlockProject: vi.fn(),
  readPendingPromo: () => null,
  clearPendingPromo: vi.fn(),
  redeemPromoCode: vi.fn(),
}))

vi.mock('@/lib/api/competitors', () => ({
  listCompetitors: (...args: unknown[]) => mockListCompetitors(...args),
}))

vi.mock('@/lib/api/report', () => ({
  getProjectReport: (...args: unknown[]) => mockGetProjectReport(...args),
}))

vi.mock('@/lib/report-export', () => ({
  downloadReportMarkdown: (...args: unknown[]) => mockDownloadReport(...args),
}))

vi.mock('@/lib/api/feedback', () => ({
  getFeedbackStatus: (...args: unknown[]) => mockGetFeedbackStatus(...args),
  submitFeedback: vi.fn(),
}))

vi.mock('@/components/project-evidence', () => ({
  ProjectEvidence: () => <div>Evidence panel</div>,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn(),
    },
  }),
}))

const CREDITS: CreditsBalance = {
  free_preview_available: true,
  starter_credits: 0,
  founder_credits: 0,
  indie_credits: 0,
  total_credits: 0,
  depth_credit_costs: { shallow: 1, standard: 2, deep: 3 },
  can_run_preview: true,
  can_run_full: false,
}

const CREDITS_PAID: CreditsBalance = {
  ...CREDITS,
  free_preview_available: false,
  total_credits: 5,
  founder_credits: 5,
  can_run_full: true,
}

const REPORT: ResearchReport = {
  id: 'r1',
  project_id: 'proj-1',
  access_level: 'full',
  idea: {
    title: 'Invoice AI',
    description: 'Automate invoices',
    category: 'Fintech',
    target_audience: 'Freelancers',
  },
  scores: {
    market_saturation: 'MEDIUM',
    market_score: 72,
    risk_score: 40,
    data_confidence: 'high',
  },
  summary: 'Strong pain around invoicing.',
  recommendations: {
    verdict: 'build',
    reasoning: 'Clear unmet need.',
    next_steps: ['Talk to 5 freelancers'],
  },
  pain_clusters: [],
  competitors: [],
  stats: {
    reviews_analyzed: 120,
    pain_signals: 48,
    products_analyzed: 8,
    clusters_found: 6,
    major_problems: 3,
    confidence_pct: 80,
    analysis_duration_sec: 90,
    time_saved_hours: 12,
  },
  created_at: '2026-06-01T00:00:00Z',
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

describe('NewResearchForm buttons and links', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockCreateProject.mockReset()
    mockGetCredits.mockReset().mockResolvedValue(CREDITS)
  })

  it('routes Back and Cancel to dashboard', async () => {
    renderWithQuery(<NewResearchForm />)
    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/dashboard')
  })

  it('keeps submit disabled until idea + industry are valid', async () => {
    const user = userEvent.setup()
    renderWithQuery(<NewResearchForm />)
    const submit = await screen.findByRole('button', { name: 'Run free preview' })
    expect(submit).toBeDisabled()

    await user.type(
      screen.getByLabelText(/Startup idea/),
      'A long enough description of the product idea here',
    )
    await user.selectOptions(screen.getByLabelText(/Industry/), 'Fintech')

    expect(screen.getByRole('button', { name: 'Run free preview' })).toBeEnabled()
  })

  it('submits free preview and navigates to progress', async () => {
    const user = userEvent.setup()
    mockCreateProject.mockResolvedValue({ id: 'proj-42' })
    renderWithQuery(<NewResearchForm />)
    await screen.findByRole('button', { name: 'Run free preview' })

    await user.type(
      screen.getByLabelText(/Startup idea/),
      'A long enough description of the product idea here',
    )
    await user.selectOptions(screen.getByLabelText(/Industry/), 'Fintech')
    await user.click(screen.getByRole('button', { name: 'Run free preview' }))

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/research/proj-42')
    })
  })

  it('toggles data sources and shows paid depth radios', async () => {
    const user = userEvent.setup()
    mockGetCredits.mockResolvedValue(CREDITS_PAID)
    renderWithQuery(<NewResearchForm />)
    await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'Research depth' })).toBeInTheDocument())

    const g2 = screen.getByRole('button', { name: /G2/i })
    expect(g2).toHaveAttribute('aria-pressed', 'true')
    await user.click(g2)
    expect(g2).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('radio', { name: /Deep/i }))
    expect(screen.getByRole('radio', { name: /Deep/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /Start analysis/i })).toBeInTheDocument()
  })
})

describe('AnalysisTheater buttons', () => {
  it('exposes Dashboard link and cancel confirm flow', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onCancelConfirm = vi.fn()
    const onCancelDismiss = vi.fn()

    render(
      <AnalysisTheater
        stage="collecting_reviews"
        competitors={[]}
        startedAt={new Date().toISOString()}
        stats={{
          reviewsCollected: 12,
          patternsFound: 2,
          competitorsChecked: 1,
          competitorsTotal: 3,
        }}
        onCancel={onCancel}
        cancelConfirm={false}
        onCancelConfirm={onCancelConfirm}
        onCancelDismiss={onCancelDismiss}
      />,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText(/Event log/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('confirm cancel exposes Yes, cancel and Keep going', async () => {
    const user = userEvent.setup()
    const onCancelConfirm = vi.fn()
    const onCancelDismiss = vi.fn()

    render(
      <AnalysisTheater
        stage="analyzing"
        competitors={[]}
        cancelConfirm
        onCancel={() => {}}
        onCancelConfirm={onCancelConfirm}
        onCancelDismiss={onCancelDismiss}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }))
    expect(onCancelConfirm).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Keep going' }))
    expect(onCancelDismiss).toHaveBeenCalled()
  })
})

describe('ResearchProgressView terminal states', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockGetProjectStatus.mockReset()
    mockListCompetitors.mockResolvedValue({ items: [] })
    mockRetryProject.mockReset()
  })

  it('completed state: View report CTA', async () => {
    mockGetProjectStatus.mockResolvedValue({
      project_id: 'proj-1',
      project_status: 'completed',
      job: {
        id: 'j1',
        status: 'completed',
        stage: 'completed',
        progress_pct: 100,
        stats: { competitors_found: 4, reviews_collected: 80, pain_clusters_found: 5 },
        error: null,
        started_at: '2026-06-01T00:00:00Z',
        completed_at: '2026-06-01T00:10:00Z',
        created_at: '2026-06-01T00:00:00Z',
      },
    })

    renderWithQuery(<ResearchProgressView projectId="proj-1" />)

    const view = await screen.findByRole('link', { name: 'View report' })
    expect(view).toHaveAttribute('href', '/research/proj-1/report')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('cancelled state: Start new analysis + Back to dashboard', async () => {
    mockGetProjectStatus.mockResolvedValue({
      project_id: 'proj-1',
      project_status: 'cancelled',
      job: {
        id: 'j1',
        status: 'cancelled',
        stage: 'cancelled',
        progress_pct: 0,
        stats: { competitors_found: 0, reviews_collected: 0, pain_clusters_found: 0 },
        error: null,
        started_at: null,
        completed_at: null,
        created_at: '2026-06-01T00:00:00Z',
      },
    })

    renderWithQuery(<ResearchProgressView projectId="proj-1" />)

    expect(await screen.findByRole('link', { name: 'Start new analysis' })).toHaveAttribute(
      'href',
      '/research/new',
    )
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })

  it('failed state: Retry analysis button works', async () => {
    const user = userEvent.setup()
    mockGetProjectStatus.mockResolvedValue({
      project_id: 'proj-1',
      project_status: 'failed',
      job: {
        id: 'j1',
        status: 'failed',
        stage: 'failed',
        progress_pct: 40,
        stats: { competitors_found: 2, reviews_collected: 10, pain_clusters_found: 0 },
        error: { message: 'Scraper blocked' },
        started_at: '2026-06-01T00:00:00Z',
        completed_at: null,
        created_at: '2026-06-01T00:00:00Z',
      },
    })
    mockRetryProject.mockResolvedValue({})

    renderWithQuery(<ResearchProgressView projectId="proj-1" />)

    await user.click(await screen.findByRole('button', { name: 'Retry analysis' }))
    await waitFor(() => expect(mockRetryProject).toHaveBeenCalledWith('proj-1'))
  })
})

describe('ReportView buttons and tabs', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockGetProjectReport.mockReset().mockResolvedValue(REPORT)
    mockGetCredits.mockResolvedValue(CREDITS_PAID)
    mockGetFeedbackStatus.mockResolvedValue({ submitted: true })
    mockDownloadReport.mockReset()
    mockRetryProject.mockReset().mockResolvedValue({})
  })

  it('exposes Dashboard, Export, Re-run, and tab switches', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReportView projectId="proj-1" />)

    expect(await screen.findByRole('heading', { name: 'Invoice AI' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')

    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(mockDownloadReport).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Customer voice' }))
    expect(screen.getByText('Evidence panel')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Report$/ }))

    await user.click(screen.getByRole('button', { name: 'Re-run' }))
    await waitFor(() => {
      expect(mockRetryProject).toHaveBeenCalledWith('proj-1')
      expect(mockPush).toHaveBeenCalledWith('/research/proj-1')
    })
  })

  it('error state links back to progress', async () => {
    mockGetProjectReport.mockRejectedValue(new Error('missing'))
    renderWithQuery(<ReportView projectId="proj-9" />)

    expect(await screen.findByRole('link', { name: 'Back to progress' })).toHaveAttribute(
      'href',
      '/research/proj-9',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByText(/Report isn’t ready yet/i)).toBeInTheDocument()
  })
})
