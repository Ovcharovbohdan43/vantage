'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { getResearchPacks, startPackCheckout } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { ResearchPack } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface PricingModalProps {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
  highlightPack?: ResearchPack
}

export function PricingModal({
  open,
  onClose,
  title = 'Get the full report',
  message = 'Validate your idea before writing code. One credit = one complete market analysis with quotes, complaint breakdowns, and an opportunity score.',
  highlightPack = 'starter',
}: PricingModalProps) {
  const [loadingPack, setLoadingPack] = useState<ResearchPack | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: packs } = useQuery({
    queryKey: ['research-packs'],
    queryFn: getResearchPacks,
    enabled: open,
  })

  if (!open) return null

  async function handleBuy(pack: ResearchPack) {
    setLoadingPack(pack)
    setError(null)
    try {
      await startPackCheckout(pack)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start checkout')
      setLoadingPack(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1c1b1d] p-6 shadow-[0_0_48px_rgba(208,188,255,0.12)]"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d0bcff]/25 bg-[#d0bcff]/10">
            <Lock size={16} className="text-[#d0bcff]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#e5e1e4]">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#cbc3d7]">{message}</p>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          {(packs ?? []).map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => handleBuy(pack.id)}
              disabled={loadingPack != null}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-colors disabled:opacity-60',
                pack.id === highlightPack
                  ? 'border-[#d0bcff]/45 bg-[#d0bcff]/10'
                  : 'border-white/10 hover:border-[#d0bcff]/30',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#e5e1e4]">
                  {pack.label}
                  {pack.id === 'founder' && (
                    <span className="ml-2 border border-[#d0bcff]/30 bg-[#d0bcff]/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#d0bcff]">
                      Popular
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums text-[#d0bcff]">
                  ${pack.price_usd}
                </span>
              </div>
              <p className="text-xs text-[#cbc3d7]">{pack.tagline}</p>
              <p className="mt-1 font-mono text-xs text-[#958ea0]">
                {pack.credits} full {pack.credits === 1 ? 'analysis' : 'analyses'}
              </p>
              {loadingPack === pack.id && (
                <p className="mt-2 text-xs text-[#d0bcff]">Redirecting to checkout…</p>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-sm text-[#ffb4ab]">{error}</p>}

        <button
          type="button"
          onClick={onClose}
          disabled={loadingPack != null}
          className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-[#cbc3d7] transition-colors hover:border-[#d0bcff]/40 hover:text-[#e5e1e4] disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  )
}

/** @deprecated use PricingModal */
export const PaywallModal = PricingModal
