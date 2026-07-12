'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthPageShell } from '@/components/auth-page-shell'
import {
  clearPendingPromo,
  redeemPromoCode,
  stashPendingPromo,
} from '@/lib/api/billing'
import { createClient } from '@/lib/supabase/client'

const fieldClass =
  'flex h-10 w-full rounded-lg border border-white/12 bg-[#131315] px-3 text-sm text-[#e5e1e4] placeholder:text-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/50 focus:ring-1 focus:ring-[#d0bcff]/25'
const labelClass = 'text-sm font-medium text-[#cbc3d7]'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [awaitingEmail, setAwaitingEmail] = useState(false)
  const [promoPending, setPromoPending] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAwaitingEmail(false)
    setPromoPending(false)
    setLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?flow=confirm`
    const normalizedPromo = promoCode.trim().toUpperCase()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: normalizedPromo ? { promo_code: normalizedPromo } : undefined,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      if (normalizedPromo) {
        try {
          await redeemPromoCode(normalizedPromo)
          clearPendingPromo()
        } catch {
          stashPendingPromo(normalizedPromo)
        }
      }
      router.push('/dashboard')
      router.refresh()
      return
    }

    if (normalizedPromo) {
      stashPendingPromo(normalizedPromo)
      setPromoPending(true)
    }
    setAwaitingEmail(true)
    setLoading(false)
  }

  return (
    <AuthPageShell
      title="Create account"
      subtitle="Start validating product ideas with real data"
      footer={
        <p className="mt-6 text-center text-sm text-[#cbc3d7]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#d0bcff] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {awaitingEmail ? (
        <div className="space-y-4">
          <AuthAlert
            variant="success"
            title="Check your inbox"
            description={
              promoPending
                ? `We sent a confirmation link to ${email}. Your promo credits unlock after you confirm and sign in.`
                : `We sent a confirmation link to ${email}. Confirm, then sign in to start your free credits.`
            }
          />
          <div className="relative overflow-hidden rounded-xl border border-[#d0bcff]/25 bg-gradient-to-br from-[#d0bcff]/12 via-[#1c1b1d] to-[#ff4ec8]/8 p-4">
            <div className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-[#d0bcff]/20 blur-2xl" />
            <p className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-[#d0bcff]">
              Don&apos;t miss it
            </p>
            <p className="relative mt-2 text-sm font-medium leading-snug text-[#e5e1e4]">
              Check Spam / Junk if the email isn&apos;t in your inbox
            </p>
            <p className="relative mt-1.5 text-xs leading-relaxed text-[#cbc3d7]">
              Confirmation mail sometimes lands there. Mark it as Not spam so future Vantage
              messages arrive normally — then open the link to activate your account.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/15 text-sm font-medium text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/40 hover:text-[#d0bcff]"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
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
            <label htmlFor="password" className={labelClass}>
              Password
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
            <label htmlFor="promo" className={labelClass}>
              Promo code <span className="font-normal text-[#958ea0]">(optional)</span>
            </label>
            <input
              id="promo"
              type="text"
              autoComplete="off"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="TRYIT"
              className={`${fieldClass} uppercase`}
            />
            <p className="text-xs text-[#958ea0]">Have a code? Enter it to get free research credits.</p>
          </div>

          {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="landing-primary-glow inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#d0bcff] text-sm font-bold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
