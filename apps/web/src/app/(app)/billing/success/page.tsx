import { Suspense } from 'react'
import { BillingSuccessClient } from '@/components/billing-success-client'
import { LoadingShell } from '@/components/ui/loading-shell'

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<LoadingShell title="Confirming payment…" />}>
      <BillingSuccessClient />
    </Suspense>
  )
}
