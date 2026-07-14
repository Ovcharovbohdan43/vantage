'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthOtpForm } from '@/components/auth-otp-form'
import { AuthPageShell } from '@/components/auth-page-shell'
import {
  authErrorClass,
  authFieldClass,
  authLabelClass,
  authLinkClass,
  authMutedLinkClass,
  authPrimaryBtnClass,
  authSecondaryBtnClass,
} from '@/components/auth-styles'
import { createClient } from '@/lib/supabase/client'

type LoginStep = 'credentials' | 'otp'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const confirmed = searchParams.get('confirmed') === 'true'
  const resetDone = searchParams.get('reset') === 'true'
  const authError = searchParams.get('error')
  const showOtpByDefault = authError === 'confirmation_failed'

  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(confirmed)
  const [showResetBanner, setShowResetBanner] = useState(resetDone)
  const [showConfirmOtp, setShowConfirmOtp] = useState(showOtpByDefault)

  useEffect(() => {
    setShowConfirmedBanner(confirmed)
  }, [confirmed])

  useEffect(() => {
    setShowResetBanner(resetDone)
  }, [resetDone])

  useEffect(() => {
    if (authError === 'confirmation_failed') setShowConfirmOtp(true)
  }, [authError])

  useEffect(() => {
    if (!confirmed && !authError && !resetDone) return
    const url = new URL(window.location.href)
    url.searchParams.delete('confirmed')
    url.searchParams.delete('error')
    url.searchParams.delete('reset')
    window.history.replaceState(
      {},
      '',
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ''),
    )
  }, [confirmed, authError, resetDone])

  async function sendLoginOtp(targetEmail: string) {
    const supabase = createClient()
    const safeNext = next.startsWith('/') ? next : '/dashboard'
    return supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const trimmedEmail = email.trim()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Password ok — drop this session until the email code is verified.
    await supabase.auth.signOut()

    const { error: otpError } = await sendLoginOtp(trimmedEmail)
    if (otpError) {
      setError(otpError.message || 'Could not send the verification code. Try again.')
      setLoading(false)
      return
    }

    setPassword('')
    setStep('otp')
    setLoading(false)
  }

  if (step === 'otp') {
    return (
      <AuthPageShell
        title="Check your email"
        subtitle="Enter the one-time code we sent to finish signing in"
        footer={
          <p className="mt-6 text-center text-sm text-v-muted">
            Wrong account?{' '}
            <button
              type="button"
              onClick={() => {
                setStep('credentials')
                setError(null)
              }}
              className={authLinkClass}
            >
              Back to sign in
            </button>
          </p>
        }
      >
        <AuthAlert
          variant="success"
          title="Code sent"
          description={`We emailed a 6-digit code to ${email.trim()}. Enter it below to access your workspace.`}
          className="mb-6"
        />

        <AuthOtpForm
          type="email"
          defaultEmail={email.trim()}
          emailReadOnly
          allowResend
          submitLabel="Verify and continue"
          onVerified={async () => {
            router.push(next.startsWith('/') ? next : '/dashboard')
            router.refresh()
          }}
        />

        <button
          type="button"
          onClick={() => {
            setStep('credentials')
            setError(null)
          }}
          className={`${authSecondaryBtnClass} mt-3`}
        >
          Use a different email
        </button>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell
      title="Sign in"
      subtitle="Access your research workspace"
      footer={
        <p className="mt-6 text-center text-sm text-v-muted">
          No account?{' '}
          <Link href="/signup" className={authLinkClass}>
            Create one
          </Link>
        </p>
      }
    >
      {showConfirmedBanner && (
        <AuthAlert
          variant="success"
          title="Email confirmed successfully"
          description="Your email address has been verified. Sign in with your account credentials to continue."
          className="mb-6"
        />
      )}

      {showResetBanner && (
        <AuthAlert
          variant="success"
          title="Password updated"
          description="Your password has been changed. Sign in with your new password."
          className="mb-6"
        />
      )}

      {authError === 'confirmation_failed' && (
        <AuthAlert
          variant="error"
          title="Confirmation link invalid or expired"
          description="Enter the one-time code from the email below, or request a new confirmation by signing up again."
          className="mb-6"
        />
      )}

      {authError === 'recovery_failed' && (
        <AuthAlert
          variant="error"
          title="Password reset link invalid or expired"
          description="Request a new reset link, or open Reset password and enter the one-time code from the email."
          className="mb-6"
        />
      )}

      {authError === 'login_otp_failed' && (
        <AuthAlert
          variant="error"
          title="Sign-in link invalid or expired"
          description="Sign in again with your password — we will email a fresh one-time code."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className={authLabelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={authFieldClass}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={authLabelClass}>
              Password
            </label>
            <Link href="/forgot-password" className={authMutedLinkClass}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authFieldClass}
          />
        </div>

        {error && <p className={authErrorClass}>{error}</p>}

        <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
          {loading ? 'Sending code…' : 'Continue'}
        </button>
        <p className="text-xs leading-relaxed text-v-muted">
          After your password is checked, we email a one-time code. You need that code to finish
          signing in.
        </p>
      </form>

      <div className="mt-8 border-t border-white/[0.08] pt-6">
        {!showConfirmOtp ? (
          <button
            type="button"
            onClick={() => setShowConfirmOtp(true)}
            className="text-sm text-v-muted transition-colors hover:text-v-on"
          >
            Have a signup confirmation code?
          </button>
        ) : (
          <div>
            <h2 className="mb-1 text-sm font-semibold text-v-on">Confirm signup with email code</h2>
            <p className="mb-4 text-xs leading-relaxed text-v-muted">
              If the signup confirmation link expired, enter the email and one-time code from that
              message.
            </p>
            <AuthOtpForm
              type="signup"
              defaultEmail={email}
              submitLabel="Confirm email"
              onVerified={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                setShowConfirmOtp(false)
                setShowConfirmedBanner(true)
                setShowResetBanner(false)
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmOtp(false)}
              className="mt-3 text-xs text-v-muted transition-colors hover:text-v-on"
            >
              Hide code form
            </button>
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
