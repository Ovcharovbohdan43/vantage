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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-v-on">Account</h1>

      <section className="mb-6 overflow-hidden rounded-md border border-white/[0.08] bg-v-surface">
        <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-v-on">Profile</p>
          <p className="mt-0.5 text-xs text-v-muted">Signed in with email</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-v-primary/15">
            <span className="text-sm font-medium text-v-primary">{getInitials(userEmail)}</span>
          </div>
          <p className="min-w-0 truncate text-sm font-medium text-v-on">{userEmail}</p>
        </div>
      </section>

      {credits && (
        <CreditsMeter
          credits={credits}
          className="mb-6"
          onBuyCredits={() => setPricingOpen(true)}
        />
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-9 items-center justify-center rounded-md border border-white/14 bg-white/[0.03] px-4 text-sm font-medium text-v-muted transition-colors hover:border-white/28 hover:text-v-on disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="Buy research credits"
        message="Pick a pack. One credit = one shallow analysis; deeper runs cost more. Credits never expire."
        highlightPack="founder"
      />
    </div>
  )
}
