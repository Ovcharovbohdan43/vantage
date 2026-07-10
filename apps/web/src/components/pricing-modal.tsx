'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  message = 'Validate your idea before writing code. One credit = one complete market analysis with quotes, opportunity map, and build/pivot recommendation.',
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
      <button type="button" className="absolute inset-0 bg-zinc-950/40" onClick={onClose} aria-label="Close" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg border border-zinc-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0 w-9 h-9 border border-zinc-200 flex items-center justify-center">
            <Lock size={16} className="text-zinc-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {(packs ?? []).map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => handleBuy(pack.id)}
              disabled={loadingPack != null}
              className={cn(
                'w-full text-left border p-4 transition-colors hover:border-zinc-400 disabled:opacity-60',
                pack.id === highlightPack ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-200',
              )}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-semibold text-zinc-950">
                  {pack.label}
                  {pack.id === 'founder' && (
                    <span className="ml-2 text-[10px] font-mono uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                      Popular
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums">${pack.price_usd}</span>
              </div>
              <p className="text-xs text-zinc-500">{pack.tagline}</p>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                {pack.credits} full {pack.credits === 1 ? 'analysis' : 'analyses'}
              </p>
              {loadingPack === pack.id && (
                <p className="text-xs text-zinc-500 mt-2">Redirecting to checkout…</p>
              )}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <Button variant="outline" onClick={onClose} disabled={loadingPack != null} className="w-full">
          Not now
        </Button>
      </div>
    </div>
  )
}

/** @deprecated use PricingModal */
export const PaywallModal = PricingModal
