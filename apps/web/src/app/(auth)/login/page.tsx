import { Suspense } from 'react'
import { LoadingShell } from '@/components/ui/loading-shell'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingShell title="Loading sign in" />}>
      <LoginForm />
    </Suspense>
  )
}
