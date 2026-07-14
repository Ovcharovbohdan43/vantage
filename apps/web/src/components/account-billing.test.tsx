import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountView } from '@/components/account-view'
import { BillingSuccessClient } from '@/components/billing-success-client'
import { PricingModal } from '@/components/pricing-modal'
import { SupportView } from '@/components/support-view'
import BillingCancelPage from '@/app/(app)/billing/cancel/page'
import type { CreditsBalance, ResearchPackInfo } from '@/lib/api/types'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
let searchParams = new URLSearchParams()

const mockSignOut = vi.fn()
const mockGetCredits = vi.fn()
const mockGetResearchPacks = vi.fn()
const mockStartPackCheckout = vi.fn()
const mockFulfillCheckout = vi.fn()
const mockSubmitSupport = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => searchParams,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

vi.mock('@/lib/api/billing', () => ({
  getCredits: (...args: unknown[]) => mockGetCredits(...args),
  getResearchPacks: (...args: unknown[]) => mockGetResearchPacks(...args),
  startPackCheckout: (...args: unknown[]) => mockStartPackCheckout(...args),
  fulfillCheckoutSession: (...args: unknown[]) => mockFulfillCheckout(...args),
}))

vi.mock('@/lib/api/support', () => ({
  submitSupportRequest: (...args: unknown[]) => mockSubmitSupport(...args),
}))

const CREDITS: CreditsBalance = {
  free_preview_available: false,
  starter_credits: 1,
  founder_credits: 0,
  indie_credits: 0,
  total_credits: 1,
  depth_credit_costs: { shallow: 1, standard: 2, deep: 3 },
  can_run_preview: false,
  can_run_full: true,
}

const PACKS: ResearchPackInfo[] = [
  {
    id: 'starter',
    label: 'Starter Research',
    price_usd: 5,
    credits: 1,
    tagline: 'First full report',
  },
  {
    id: 'founder',
    label: 'Founder Pack',
    price_usd: 25,
    credits: 5,
    tagline: 'Compare ideas',
  },
  {
    id: 'indie',
    label: 'Indie Hacker',
    price_usd: 100,
    credits: 20,
    tagline: 'High volume',
  },
]

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

describe('AccountView buttons', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSignOut.mockReset().mockResolvedValue({})
    mockGetCredits.mockReset().mockResolvedValue(CREDITS)
    mockGetResearchPacks.mockReset().mockResolvedValue(PACKS)
    mockStartPackCheckout.mockReset()
  })

  it('opens pricing modal from Buy credits and closes with Not now', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AccountView userEmail="founder@example.com" />)

    const buy = await screen.findByRole('button', { name: 'Buy credits' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(buy)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Buy research credits')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('signs out and redirects to login', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AccountView userEmail="founder@example.com" />)
    await waitFor(() => expect(mockGetCredits).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})

describe('PricingModal pack buttons', () => {
  beforeEach(() => {
    mockGetResearchPacks.mockReset().mockResolvedValue(PACKS)
    mockStartPackCheckout.mockReset().mockResolvedValue(undefined)
  })

  it('renders pack CTAs and starts checkout', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithQuery(
      <PricingModal open onClose={onClose} title="Buy research credits" highlightPack="founder" />,
    )

    expect(await screen.findByText('Founder Pack')).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()

    const starterRow = screen.getByText('Starter Research').closest('li')
    expect(starterRow).toBeTruthy()
    await user.click(within(starterRow as HTMLElement).getByRole('button', { name: 'Buy' }))
    await waitFor(() => expect(mockStartPackCheckout).toHaveBeenCalledWith('starter'))
  })

  it('Close overlay dismisses modal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithQuery(<PricingModal open onClose={onClose} />)

    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows checkout error without crashing', async () => {
    const user = userEvent.setup()
    mockStartPackCheckout.mockRejectedValue(new Error('network'))
    renderWithQuery(<PricingModal open onClose={() => {}} />)

    const indieRow = (await screen.findByText('Indie Hacker')).closest('li')
    expect(indieRow).toBeTruthy()
    await user.click(within(indieRow as HTMLElement).getByRole('button', { name: 'Buy' }))
    expect(await screen.findByText('Could not start checkout')).toBeInTheDocument()
  })
})

describe('SupportView buttons', () => {
  beforeEach(() => {
    mockSubmitSupport.mockReset()
  })

  it('validates message and submits support request', async () => {
    const user = userEvent.setup()
    mockSubmitSupport.mockResolvedValue({ ok: true })
    window.localStorage.removeItem('vantage_support_last_sent_at')
    renderWithQuery(<SupportView />)

    await user.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText(/Please describe your problem/i)).toBeInTheDocument()

    await user.type(
      screen.getByLabelText(/Describe your problem/),
      'Credits did not update after payment',
    )
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => expect(mockSubmitSupport).toHaveBeenCalled())
    expect(await screen.findByText('Message sent')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Wait/i })).toBeDisabled()
  })
})

describe('BillingSuccessClient buttons', () => {
  beforeEach(() => {
    mockPush.mockReset()
    searchParams = new URLSearchParams('session_id=cs_test&pack=founder')
    mockFulfillCheckout.mockReset().mockResolvedValue({
      credits_added: 5,
      total_credits: 5,
    })
  })

  it('routes Validate an idea and Back to dashboard', async () => {
    const user = userEvent.setup()
    renderWithQuery(<BillingSuccessClient />)

    expect(await screen.findByText('Credits added')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Validate an idea' }))
    expect(mockPush).toHaveBeenCalledWith('/research/new')
  })

  it('Back to dashboard navigates correctly', async () => {
    const user = userEvent.setup()
    renderWithQuery(<BillingSuccessClient />)
    await screen.findByText('Credits added')

    await user.click(screen.getByRole('button', { name: 'Back to dashboard' }))
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})

describe('BillingCancelPage links', () => {
  it('exposes dashboard and account CTAs', () => {
    render(<BillingCancelPage />)

    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
    expect(screen.getByRole('link', { name: 'Buy credits' })).toHaveAttribute('href', '/account')
  })
})
