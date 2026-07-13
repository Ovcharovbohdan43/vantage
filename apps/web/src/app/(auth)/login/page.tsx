import { Suspense } from 'react'
import { LoginForm } from './login-form'

function LoginFallback() {
  return (
    <div className="landing-root flex min-h-screen items-center justify-center px-5">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-v-primary" />
        <p className="text-sm text-v-muted">Loading sign in…</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
