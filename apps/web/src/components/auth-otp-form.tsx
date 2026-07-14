'use client'

import { useEffect, useState } from 'react'
import {
  authErrorClass,
  authFieldClass,
  authHintClass,
  authLabelClass,
  authPrimaryBtnClass,
  authSecondaryBtnClass,
} from '@/components/auth-styles'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export type AuthOtpType = 'signup' | 'recovery' | 'email'

interface AuthOtpFormProps {
  type: AuthOtpType
  /** Pre-fill email when known */
  defaultEmail?: string
  /** Lock the email field (login challenge after password). */
  emailReadOnly?: boolean
  submitLabel?: string
  className?: string
  /** Show resend for login email OTP. */
  allowResend?: boolean
  onVerified: () => void | Promise<void>
}

function normalizeToken(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 8)
}

export function AuthOtpForm({
  type,
  defaultEmail = '',
  emailReadOnly = false,
  submitLabel = 'Verify code',
  className,
  allowResend = false,
  onVerified,
}: AuthOtpFormProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentHint, setResentHint] = useState<string | null>(null)

  useEffect(() => {
    setEmail(defaultEmail)
  }, [defaultEmail])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResentHint(null)

    const trimmedEmail = email.trim()
    const code = normalizeToken(token)
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter the email address from the message.')
      return
    }
    if (code.length < 6) {
      setError('Enter the 6-digit code from the email.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: code,
      type,
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    try {
      await onVerified()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResentHint(null)
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email before resending.')
      return
    }
    if (type !== 'email') return

    setResending(true)
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    })
    setResending(false)

    if (otpError) {
      setError(otpError.message)
      return
    }
    setResentHint('A new code was sent. Check your inbox.')
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate>
      <div className="space-y-2">
        <label htmlFor={`otp-email-${type}`} className={authLabelClass}>
          Email
        </label>
        <input
          id={`otp-email-${type}`}
          type="email"
          autoComplete="email"
          required
          readOnly={emailReadOnly}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={cn(authFieldClass, emailReadOnly && 'opacity-80')}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`otp-token-${type}`} className={authLabelClass}>
          One-time code
        </label>
        <input
          id={`otp-token-${type}`}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          minLength={6}
          maxLength={8}
          value={token}
          onChange={(e) => setToken(normalizeToken(e.target.value))}
          placeholder="123456"
          className={cn(authFieldClass, 'font-landing-mono tracking-[0.2em]')}
          aria-describedby={`otp-hint-${type}`}
        />
        <p id={`otp-hint-${type}`} className={authHintClass}>
          {type === 'email'
            ? 'Enter the 6-digit code from the sign-in email we just sent.'
            : 'Use the code from your Vantage email if the link expired.'}
        </p>
      </div>

      {error && <p className={authErrorClass}>{error}</p>}
      {resentHint && <p className="text-sm text-v-tertiary">{resentHint}</p>}

      <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
        {loading ? 'Verifying…' : submitLabel}
      </button>

      {allowResend && type === 'email' && (
        <button
          type="button"
          disabled={resending || loading}
          onClick={() => void handleResend()}
          className={authSecondaryBtnClass}
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      )}
    </form>
  )
}
