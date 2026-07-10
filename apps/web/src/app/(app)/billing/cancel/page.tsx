import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function BillingCancelPage() {
  return (
    <div className="max-w-md mx-auto px-8 py-20 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Checkout canceled</p>
      <h1 className="text-xl font-semibold text-zinc-950 mb-2">No changes made</h1>
      <p className="text-sm text-zinc-600 leading-relaxed mb-8">
        You can upgrade anytime from the dashboard or after viewing a report.
      </p>
      <Link href="/dashboard">
        <Button variant="outline">Back to dashboard</Button>
      </Link>
    </div>
  )
}
