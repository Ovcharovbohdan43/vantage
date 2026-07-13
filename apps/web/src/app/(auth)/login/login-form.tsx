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
} from '@/components/auth-styles'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const confirmed = searchParams.get('confirmed') === 'true'
  const resetDone = searchParams.get('reset') === 'true'
  const authError = searchParams.get('error')
  const showOtpByDefault = authError === 'confirmation_failed'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-8 border-t border-white/[0.08] pt-6">
        {!showConfirmOtp ? (
          <button
            type="button"
            onClick={() => setShowConfirmOtp(true)}
            className="text-sm text-v-muted transition-colors hover:text-v-on"
          >
            Have a confirmation code?
          </button>
        ) : (
          <div>
            <h2 className="mb-1 text-sm font-semibold text-v-on">Confirm with email code</h2>
            <p className="mb-4 text-xs leading-relaxed text-v-muted">
              If the confirmation link expired, enter the email and one-time code from the message.
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
