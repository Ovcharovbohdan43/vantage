'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthPageShell } from '@/components/auth-page-shell'
import { createClient } from '@/lib/supabase/client'

const fieldClass =
  'flex h-10 w-full rounded-lg border border-white/12 bg-[#131315] px-3 text-sm text-[#e5e1e4] placeholder:text-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/50 focus:ring-1 focus:ring-[#d0bcff]/25'
const labelClass = 'text-sm font-medium text-[#cbc3d7]'

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
        <p className="mt-6 text-center text-sm text-[#cbc3d7]">
          <Link href="/login" className="font-medium text-[#d0bcff] hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {!ready ? (
        <p className="text-sm text-[#cbc3d7]">Checking reset link…</p>
      ) : sessionMissing ? (
        <AuthAlert
          variant="error"
          title="Reset link invalid or expired"
          description="Request a new password reset email and open the latest link."
          className="mb-2"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className={labelClass}>
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
              className={fieldClass}
            />
            <p className="text-xs text-[#958ea0]">Minimum 8 characters</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm" className={labelClass}>
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
              className={fieldClass}
            />
          </div>

          {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="landing-primary-glow inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#d0bcff] text-sm font-bold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}

      {sessionMissing && (
        <p className="mt-4 text-center text-sm text-[#cbc3d7]">
          <Link href="/forgot-password" className="font-medium text-[#d0bcff] hover:underline">
            Request a new reset link
          </Link>
        </p>
      )}
    </AuthPageShell>
  )
}
