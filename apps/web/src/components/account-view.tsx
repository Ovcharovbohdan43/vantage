'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CreditsMeter } from '@/components/credits-meter'
import { PricingModal } from '@/components/pricing-modal'
import { getCredits } from '@/lib/api/billing'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'

interface AccountViewProps {
  userEmail: string
}

export function AccountView({ userEmail }: AccountViewProps) {
  const router = useRouter()
  const [pricingOpen, setPricingOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
    staleTime: 0,
  })

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-48 w-48 rounded-full bg-[#d0bcff]/10 blur-[90px]" />
      </div>

      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#e5e1e4]">Account</h1>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#958ea0]">
          Profile
        </p>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d0bcff]/20">
            <span className="text-sm font-medium text-[#d0bcff]">{getInitials(userEmail)}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#e5e1e4]">{userEmail}</p>
            <p className="mt-0.5 text-xs text-[#958ea0]">Signed in with email</p>
          </div>
        </div>
      </section>

      {credits && <CreditsMeter credits={credits} className="mb-6" />}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setPricingOpen(true)}
          className="landing-primary-glow inline-flex items-center justify-center rounded-lg bg-[#d0bcff] px-4 py-2.5 text-sm font-semibold text-[#3c0091] transition-transform hover:-translate-y-0.5"
        >
          Buy credits
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-[#1c1b1d] px-4 py-2.5 text-sm text-[#cbc3d7] transition-colors hover:border-[#d0bcff]/35 hover:text-[#d0bcff] disabled:opacity-60"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="Buy research credits"
        message="Credits power full market analyses. One credit = one shallow analysis; deeper runs cost more."
        highlightPack="founder"
      />
    </div>
  )
}
