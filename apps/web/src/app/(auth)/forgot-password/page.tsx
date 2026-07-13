'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthPageShell } from '@/components/auth-page-shell'
import {
  authErrorClass,
  authFieldClass,
  authHintClass,
  authLabelClass,
  authLinkClass,
  authPrimaryBtnClass,
} from '@/components/auth-styles'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const trimmed = email.trim()
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?flow=recovery`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSubmittedEmail(trimmed)
    setLoading(false)
  }

  return (
    <AuthPageShell
      title={submittedEmail ? 'Check your email' : 'Forgot password'}
      subtitle={
        submittedEmail
          ? 'We sent password reset instructions if that address has an account'
          : 'Enter your email and we’ll send instructions to choose a new password'
      }
      footer={
        <p className="mt-6 text-center text-sm text-v-muted">
          Remembered it?{' '}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </p>
      }
    >
      {submittedEmail ? (
        <div className="space-y-5">
          <AuthAlert
            variant="success"
            title="Reset email on the way"
            description={`If an account exists for ${submittedEmail}, you’ll get a message with a reset link and a one-time code. It may take a minute — check spam if you don’t see it.`}
          />
          <p className={authHintClass}>
            Open the link from the email, or go to{' '}
            <Link href="/reset-password" className={authLinkClass}>
              Reset password
            </Link>{' '}
            and enter the one-time code if the link expired.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                setSubmittedEmail(null)
                setError(null)
                setEmail('')
              }}
              className={authPrimaryBtnClass}
            >
              Use a different email
            </button>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/14 px-4 text-sm font-medium text-v-muted transition-colors hover:border-white/28 hover:text-v-on"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            <p className={authHintClass}>
              We’ll only email you if this address is registered with Vantage.
            </p>
          </div>

          {error && <p className={authErrorClass}>{error}</p>}

          <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
            {loading ? 'Sending…' : 'Send reset email'}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
