import Link from 'next/link'

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="mb-3 font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
        Checkout canceled
      </p>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-v-on">No changes made</h1>
      <p className="mb-8 text-sm leading-relaxed text-v-muted">
        You can upgrade anytime from Account or after viewing a report.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-md bg-v-on px-5 text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </Link>
        <Link
          href="/account"
          className="inline-flex h-11 items-center justify-center rounded-md border border-white/14 px-5 text-sm font-medium text-v-on transition-colors hover:border-white/28"
        >
          Buy credits
        </Link>
      </div>
    </div>
  )
}
