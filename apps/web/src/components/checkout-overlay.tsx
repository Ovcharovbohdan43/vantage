'use client'

export function CheckoutOverlay() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-zinc-950">Redirecting to checkout…</p>
      <p className="text-xs text-zinc-500 mt-1">Secure payment via Stripe</p>
    </div>
  )
}
