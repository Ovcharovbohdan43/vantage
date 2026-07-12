'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AuthPageShell } from '@/components/auth-page-shell'
import { createClient } from '@/lib/supabase/client'

const fieldClass =
  'flex h-10 w-full rounded-lg border border-white/12 bg-[#131315] px-3 text-sm text-[#e5e1e4] placeholder:text-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/50 focus:ring-1 focus:ring-[#d0bcff]/25'
const labelClass = 'text-sm font-medium text-[#cbc3d7]'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?flow=recovery`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setMessage('If an account exists for that email, we sent a reset link via Resend. Check your inbox.')
    setLoading(false)
  }

  return (
    <AuthPageShell
      title="Forgot password"
      subtitle="We’ll email you a link to choose a new password"
      footer={
        <p className="mt-6 text-center text-sm text-[#cbc3d7]">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-[#d0bcff] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
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

        {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}
        {message && <p className="text-sm text-[#4edea3]">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="landing-primary-glow inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#d0bcff] text-sm font-bold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthPageShell>
  )
}
