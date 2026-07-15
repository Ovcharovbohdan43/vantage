import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareReport } from '@/components/share-report'
import { ApiError } from '@/lib/api/client'

const writeText = vi.fn()
const open = vi.fn()
const {
  mockGenerateLibraryShareDraft,
  mockCreateShareDraftCheckout,
  mockFulfillShareDraftCheckout,
} = vi.hoisted(() => ({
  mockGenerateLibraryShareDraft: vi.fn(),
  mockCreateShareDraftCheckout: vi.fn(),
  mockFulfillShareDraftCheckout: vi.fn(),
}))

vi.mock('@/lib/api/library', () => ({
  generateLibraryShareDraft: (...args: unknown[]) => mockGenerateLibraryShareDraft(...args),
}))

vi.mock('@/lib/api/report', () => ({
  generateReportShareDraft: vi.fn(),
}))

vi.mock('@/lib/api/idea-of-week', () => ({
  generateIdeaOfWeekShareDraft: vi.fn(),
}))

vi.mock('@/lib/api/billing', () => ({
  createShareDraftCheckout: (...args: unknown[]) => mockCreateShareDraftCheckout(...args),
  fulfillShareDraftCheckout: (...args: unknown[]) => mockFulfillShareDraftCheckout(...args),
}))

describe('ShareReport', () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined)
    open.mockReset()
    mockGenerateLibraryShareDraft.mockReset()
    mockCreateShareDraftCheckout.mockReset()
    mockFulfillShareDraftCheckout.mockReset()
    vi.spyOn(window, 'open').mockImplementation(open)
  })

  it('warns on private reports, allows editing, copies, and opens Reddit composer', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    render(
      <ShareReport
        payload={{
          title: 'Original title',
          text: 'I analyzed a startup idea and the results surprised me.',
          url: 'https://www.vantageserch.app/',
          privateReport: true,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Share report' }))

    expect(screen.getByText(/This is a private report/i)).toBeInTheDocument()
    const title = screen.getByLabelText('Post title')
    await user.clear(title)
    await user.type(title, 'Edited market finding')
    await user.click(screen.getByRole('button', { name: 'Copy post' }))

    expect(writeText).toHaveBeenCalledWith(
      'I analyzed a startup idea and the results surprised me.',
    )
    expect(screen.getByText('The complete post is ready to paste.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Open Reddit/i }))

    expect(open).toHaveBeenCalledTimes(1)
    const [url, target, features] = open.mock.calls[0]!
    expect(new URL(url).searchParams.get('title')).toBe('Edited market finding')
    expect(target).toBe('_blank')
    expect(features).toBe('noopener,noreferrer')
  })

  it('keeps the fallback free and generates only after checkout entitlement', async () => {
    const user = userEvent.setup()
    mockCreateShareDraftCheckout.mockResolvedValue({
      entitlement_id: 'entitlement-1',
      checkout_url: null,
      payment_required: false,
      amount_cents: 0,
      currency: 'usd',
    })
    mockGenerateLibraryShareDraft.mockResolvedValue({
      title: 'Natural Reddit title',
      text: 'I analyzed a startup idea and the results surprised me.\n\nThis sounds more like a real post.',
    })
    render(
      <ShareReport
        payload={{
          title: 'Fallback title',
          text: 'Fallback post',
          url: 'https://www.vantageserch.app/library/example',
        }}
        draftSource={{ kind: 'library', slug: 'example' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Share report' }))

    expect(screen.getByDisplayValue('Fallback title')).toBeInTheDocument()
    expect(mockCreateShareDraftCheckout).not.toHaveBeenCalled()
    expect(mockGenerateLibraryShareDraft).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Generate draft - $0.50' }))

    expect(mockCreateShareDraftCheckout).toHaveBeenCalledWith({ kind: 'library', slug: 'example' })
    expect(mockGenerateLibraryShareDraft).toHaveBeenCalledWith('example', 'entitlement-1')
    expect(await screen.findByDisplayValue('Natural Reddit title')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/This sounds more like a real post/i)).toBeInTheDocument()
  })

  it('keeps fallback available and offers login to unauthenticated visitors', async () => {
    const user = userEvent.setup()
    mockCreateShareDraftCheckout.mockRejectedValue(new ApiError('Not authenticated', 401))
    render(
      <ShareReport
        payload={{
          title: 'Fallback title',
          text: 'Fallback post remains editable.',
          url: 'https://www.vantageserch.app/library/example',
        }}
        draftSource={{ kind: 'library', slug: 'example' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Share report' }))
    await user.click(screen.getByRole('button', { name: 'Generate draft - $0.50' }))

    expect(screen.getByDisplayValue('Fallback post remains editable.')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Flibrary%2Fexample',
    )
  })
})
