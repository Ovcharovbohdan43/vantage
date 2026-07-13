'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthOtpForm } from '@/components/auth-otp-form'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionMissing, setSessionMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (!data.session) {
        setSessionMissing(true)
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?reset=true')
    router.refresh()
  }

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="Enter a new password for your Vantage account"
      footer={
        <p className="mt-6 text-center text-sm text-v-muted">
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      }
    >
      {!ready ? (
        <p className="text-sm text-v-muted">Checking reset link…</p>
      ) : sessionMissing ? (
        <div>
          <AuthAlert
            variant="error"
            title="Reset link missing or expired"
            description="Enter the email and one-time code from your reset message, or request a new link."
            className="mb-6"
          />
          <AuthOtpForm
            type="recovery"
            submitLabel="Verify reset code"
            onVerified={async () => {
              setSessionMissing(false)
              setError(null)
            }}
          />
          <p className="mt-4 text-center text-sm text-v-muted">
            <Link href="/forgot-password" className={authLinkClass}>
              Request a new reset link
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className={authLabelClass}>
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldClass}
            />
            <p className={authHintClass}>Minimum 8 characters</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm" className={authLabelClass}>
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authFieldClass}
            />
          </div>

          {error && <p className={authErrorClass}>{error}</p>}

          <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
