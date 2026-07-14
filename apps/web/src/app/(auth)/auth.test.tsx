import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPageShell } from '@/components/auth-page-shell'
import { LoginForm } from '@/app/(auth)/login/login-form'
import SignupPage from '@/app/(auth)/signup/page'
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
let searchParams = new URLSearchParams()

const mockSignInWithPassword = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockSignUp = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockGetSession = vi.fn()
const mockUpdateUser = vi.fn()
const mockSignOut = vi.fn()
const mockVerifyOtp = vi.fn()

const mockRedeemPromo = vi.fn()
const mockStashPendingPromo = vi.fn()
const mockClearPendingPromo = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => searchParams,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOtp: mockSignInWithOtp,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
      verifyOtp: mockVerifyOtp,
    },
  }),
}))

vi.mock('@/lib/api/billing', () => ({
  redeemPromoCode: (...args: unknown[]) => mockRedeemPromo(...args),
  stashPendingPromo: (...args: unknown[]) => mockStashPendingPromo(...args),
  clearPendingPromo: (...args: unknown[]) => mockClearPendingPromo(...args),
}))

function hrefOf(name: string | RegExp) {
  return screen.getByRole('link', { name }).getAttribute('href')
}

describe('AuthPageShell', () => {
  it('routes brand mark to home', () => {
    render(
      <AuthPageShell title="Title" subtitle="Sub">
        <button type="button">Action</button>
      </AuthPageShell>,
    )

    expect(hrefOf('Vantage')).toBe('/')
  })
})

describe('LoginForm buttons and links', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams()
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSignInWithPassword.mockReset()
    mockSignInWithOtp.mockReset()
    mockVerifyOtp.mockReset()
    mockSignOut.mockReset()
  })

  it('exposes correct destinations for all links', () => {
    render(<LoginForm />)

    expect(hrefOf('Vantage')).toBe('/')
    expect(hrefOf('Create one')).toBe('/signup')
    expect(hrefOf('Forgot password?')).toBe('/forgot-password')
  })

  it('checks password then sends login OTP instead of navigating', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({})
    mockSignInWithOtp.mockResolvedValue({ error: null })

    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'founder@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'founder@example.com',
        password: 'password123',
      })
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockSignInWithOtp).toHaveBeenCalled()
    })
    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('verifies login OTP and honors next search param', async () => {
    const user = userEvent.setup()
    searchParams = new URLSearchParams('next=/research/new')
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({})
    mockSignInWithOtp.mockResolvedValue({ error: null })
    mockVerifyOtp.mockResolvedValue({ data: { session: {} }, error: null })

    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('button', { name: 'Verify and continue' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('One-time code'), '482910')
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '482910',
        type: 'email',
      })
      expect(mockPush).toHaveBeenCalledWith('/research/new')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('verifies signup OTP and shows confirmed banner', async () => {
    const user = userEvent.setup()
    mockVerifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    mockSignOut.mockResolvedValue({})

    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: 'Have a signup confirmation code?' }))
    await user.type(screen.getByLabelText('Email', { selector: '#otp-email-signup' }), 'a@b.com')
    await user.type(screen.getByLabelText('One-time code'), '482910')
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '482910',
        type: 'signup',
      })
      expect(mockSignOut).toHaveBeenCalled()
    })
    expect(await screen.findByText('Email confirmed successfully')).toBeInTheDocument()
  })

  it('shows auth error and keeps Continue enabled after failure', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('shows confirmed banner when confirmed=true', () => {
    searchParams = new URLSearchParams('confirmed=true')
    render(<LoginForm />)

    expect(screen.getByText('Email confirmed successfully')).toBeInTheDocument()
  })
})

describe('SignupPage buttons and links', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSignUp.mockReset()
    mockRedeemPromo.mockReset()
    mockStashPendingPromo.mockReset()
    mockClearPendingPromo.mockReset()
  })

  it('exposes brand and sign-in links', () => {
    render(<SignupPage />)

    expect(hrefOf('Vantage')).toBe('/')
    expect(hrefOf('Sign in')).toBe('/login')
  })

  it('creates account and redirects when session is returned', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })

    render(<SignupPage />)

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows inbox state and Back to sign in after email confirmation flow', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null })

    render(<SignupPage />)

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
    expect(hrefOf('Back to sign in')).toBe('/login')
  })

  it('stashes promo and still exposes Back to sign in CTA', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null })

    render(<SignupPage />)

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText(/Promo code/), 'tryit')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(mockStashPendingPromo).toHaveBeenCalledWith('TRYIT')
    })
    expect(hrefOf('Back to sign in')).toBe('/login')
  })

  it('shows signup error without navigating', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ data: { session: null }, error: { message: 'User already registered' } })

    render(<SignupPage />)

    await user.type(screen.getByLabelText('Email'), 'old@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('User already registered')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('ForgotPasswordPage buttons and links', () => {
  beforeEach(() => {
    mockResetPasswordForEmail.mockReset()
  })

  it('exposes brand and sign-in links', () => {
    render(<ForgotPasswordPage />)

    expect(hrefOf('Vantage')).toBe('/')
    expect(hrefOf('Sign in')).toBe('/login')
  })

  it('sends reset email and shows inbox success state', async () => {
    const user = userEvent.setup()
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Send reset email' }))

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalled()
    })
    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    expect(screen.getByText('Reset email on the way')).toBeInTheDocument()
    expect(screen.queryByText(/Resend/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use a different email' })).toBeInTheDocument()
    expect(hrefOf('Back to sign in')).toBe('/login')
  })

  it('surfaces reset errors', async () => {
    const user = userEvent.setup()
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Rate limit' } })

    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Send reset email' }))

    expect(await screen.findByText('Rate limit')).toBeInTheDocument()
  })
})

describe('ResetPasswordPage buttons and links', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockGetSession.mockReset()
    mockUpdateUser.mockReset()
    mockSignOut.mockReset()
    mockVerifyOtp.mockReset()
  })

  it('with valid session: update password then go to login', async () => {
    const user = userEvent.setup()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({})

    render(<ResetPasswordPage />)

    expect(await screen.findByRole('button', { name: 'Update password' })).toBeInTheDocument()
    expect(hrefOf('Vantage')).toBe('/')
    expect(hrefOf('Back to sign in')).toBe('/login')

    await user.click(screen.getByRole('link', { name: 'Back to sign in' }))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    mockSignOut.mockClear()
    mockPush.mockClear()

    await user.type(screen.getByLabelText('New password'), 'newpass12')
    await user.type(screen.getByLabelText('Confirm password'), 'newpass12')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass12' })
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login?reset=true')
    })
  })

  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 't' } } })

    render(<ResetPasswordPage />)
    await screen.findByRole('button', { name: 'Update password' })

    await user.type(screen.getByLabelText('New password'), 'newpass12')
    await user.type(screen.getByLabelText('Confirm password'), 'different1')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('when session missing: verifies recovery OTP then updates password', async () => {
    const user = userEvent.setup()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockVerifyOtp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({})

    render(<ResetPasswordPage />)

    expect(await screen.findByText('Reset link missing or expired')).toBeInTheDocument()
    expect(hrefOf('Request a new reset link')).toBe('/forgot-password')

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('One-time code'), '917304')
    await user.click(screen.getByRole('button', { name: 'Verify reset code' }))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '917304',
        type: 'recovery',
      })
    })

    expect(await screen.findByRole('button', { name: 'Update password' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('New password'), 'newpass12')
    await user.type(screen.getByLabelText('Confirm password'), 'newpass12')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass12' })
      expect(mockPush).toHaveBeenCalledWith('/login?reset=true')
    })
  })
})

describe('Auth interactive CTA inventory', () => {
  it('login has only expected interactive controls', () => {
    searchParams = new URLSearchParams()
    render(<LoginForm />)

    const links = screen.getAllByRole('link').map((el) => el.getAttribute('href'))
    expect(links).toEqual(expect.arrayContaining(['/', '/signup', '/forgot-password']))
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveAttribute('type', 'submit')
  })

  it('signup form has only expected interactive controls', () => {
    render(<SignupPage />)

    const links = screen.getAllByRole('link').map((el) => el.getAttribute('href'))
    expect(links).toEqual(expect.arrayContaining(['/', '/login']))
    expect(screen.getByRole('button', { name: 'Create account' })).toHaveAttribute('type', 'submit')
  })

  it('every auth link has a real destination', () => {
    render(
      <AuthPageShell
        title="T"
        subtitle="S"
        footer={
          <a href="/login">Sign in</a>
        }
      >
        <a href="/forgot-password">Forgot</a>
      </AuthPageShell>,
    )

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).not.toBe('#')
    }
  })
})
