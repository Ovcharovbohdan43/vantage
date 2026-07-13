'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  authSecondaryBtnClass,
} from '@/components/auth-styles'
import {
  clearPendingPromo,
  redeemPromoCode,
  stashPendingPromo,
} from '@/lib/api/billing'
import { createClient } from '@/lib/supabase/client'

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
        <p className="mt-6 text-center text-sm text-v-muted">
          Already have an account?{' '}
          <Link href="/login" className={authLinkClass}>
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
          <div className="rounded-lg border border-white/[0.08] bg-v-bg px-4 py-4">
            <p className="font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
              Don&apos;t miss it
            </p>
            <p className="mt-2 text-sm font-medium leading-snug text-v-on">
              Check Spam / Junk if the email isn&apos;t in your inbox
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-v-muted">
              Confirmation mail sometimes lands there. Mark it as Not spam so future Vantage
              messages arrive normally — then open the link to activate your account.
            </p>
          </div>
          <Link href="/login" className={authSecondaryBtnClass}>
            Back to sign in
          </Link>
        </div>
      ) : (
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
            <label htmlFor="password" className={authLabelClass}>
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
              className={authFieldClass}
            />
            <p className={authHintClass}>Minimum 8 characters</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="promo" className={authLabelClass}>
              Promo code <span className="font-normal text-v-muted">(optional)</span>
            </label>
            <input
              id="promo"
              type="text"
              autoComplete="off"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="TRYIT"
              className={`${authFieldClass} uppercase`}
            />
            <p className={authHintClass}>Have a code? Enter it to get free research credits.</p>
          </div>

          {error && <p className={authErrorClass}>{error}</p>}

          <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
