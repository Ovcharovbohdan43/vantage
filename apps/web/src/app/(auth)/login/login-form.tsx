'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth-alert'
import { AuthPageShell } from '@/components/auth-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const confirmed = searchParams.get('confirmed') === 'true'
  const authError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(confirmed)

  useEffect(() => {
    setShowConfirmedBanner(confirmed)
  }, [confirmed])

  useEffect(() => {
    if (!confirmed && !authError) return
    const url = new URL(window.location.href)
    url.searchParams.delete('confirmed')
    url.searchParams.delete('error')
    window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ''))
  }, [confirmed, authError])

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
        <p className="text-sm text-zinc-500 mt-6 text-center">
          No account?{' '}
          <Link href="/signup" className="text-zinc-950 font-medium hover:underline">
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

        {authError === 'confirmation_failed' && (
          <AuthAlert
            variant="error"
            title="Confirmation link invalid or expired"
            description="Please sign up again or request a new confirmation email."
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
    </AuthPageShell>
  )
}
