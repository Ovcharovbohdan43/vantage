'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthPageShell } from '@/components/auth-page-shell'
import { createClient } from '@/lib/supabase/client'

const fieldClass =
  'flex h-10 w-full rounded-lg border border-white/12 bg-[#131315] px-3 text-sm text-[#e5e1e4] placeholder:text-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/50 focus:ring-1 focus:ring-[#d0bcff]/25'
const labelClass = 'text-sm font-medium text-[#cbc3d7]'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const confirmed = searchParams.get('confirmed') === 'true'
  const resetDone = searchParams.get('reset') === 'true'
  const authError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(confirmed)
  const [showResetBanner, setShowResetBanner] = useState(resetDone)

  useEffect(() => {
    setShowConfirmedBanner(confirmed)
  }, [confirmed])

  useEffect(() => {
    setShowResetBanner(resetDone)
  }, [resetDone])

  useEffect(() => {
    if (!confirmed && !authError && !resetDone) return
    const url = new URL(window.location.href)
    url.searchParams.delete('confirmed')
    url.searchParams.delete('error')
    url.searchParams.delete('reset')
    window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ''))
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
        <p className="mt-6 text-center text-sm text-[#cbc3d7]">
          No account?{' '}
          <Link href="/signup" className="font-medium text-[#d0bcff] hover:underline">
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
          description="Please sign up again or request a new confirmation email."
          className="mb-6"
        />
      )}

      {authError === 'recovery_failed' && (
        <AuthAlert
          variant="error"
          title="Password reset link invalid or expired"
          description="Request a new reset link from the forgot password page."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>
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
            className={fieldClass}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[#d0bcff] hover:underline"
            >
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
            className={fieldClass}
          />
        </div>

        {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="landing-primary-glow inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#d0bcff] text-sm font-bold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthPageShell>
  )
}
