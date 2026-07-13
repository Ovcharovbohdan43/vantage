'use client'

import { useEffect, useId, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
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

/**
 * GitHub-style purchase dialog: dense plan rows, header + close,
 * per-row Buy button — not a marketing card stack.
 */
export function PricingModal({
  open,
  onClose,
  title = 'Buy research credits',
  message = 'Pick a pack. One credit = one shallow analysis; deeper runs cost more. Credits never expire.',
  highlightPack = 'founder',
}: PricingModalProps) {
  const titleId = useId()
  const [loadingPack, setLoadingPack] = useState<ResearchPack | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: packs, isLoading } = useQuery({
    queryKey: ['research-packs'],
    queryFn: getResearchPacks,
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setLoadingPack(null)
      setError(null)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loadingPack == null) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, loadingPack])

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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={() => {
          if (loadingPack == null) onClose()
        }}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-white/[0.1] bg-v-surface shadow-2xl sm:rounded-xl"
      >
        {/* GitHub dialog header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5 sm:px-5">
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-v-on">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-v-muted">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loadingPack != null}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-v-muted transition-colors hover:bg-white/[0.06] hover:text-v-on disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Plan list — GitHub billing row rhythm */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <p className="px-5 py-8 text-center text-sm text-v-muted">Loading packs…</p>
          )}

          {!isLoading && (packs?.length ?? 0) === 0 && (
            <p className="px-5 py-8 text-center text-sm text-v-muted">No packs available.</p>
          )}

          <ul className="divide-y divide-white/[0.06]">
            {(packs ?? []).map((pack) => {
              const highlighted = pack.id === highlightPack
              const buying = loadingPack === pack.id
              return (
                <li
                  key={pack.id}
                  className={cn(
                    'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5',
                    highlighted && 'bg-v-primary/[0.04]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-v-on">{pack.label}</span>
                      {pack.id === 'founder' && (
                        <span className="rounded-full border border-v-primary/35 bg-v-primary/10 px-1.5 py-px font-landing-mono text-[10px] font-medium uppercase tracking-wide text-v-primary">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-v-muted">{pack.tagline}</p>
                    <p className="mt-1 font-landing-mono text-[11px] text-v-muted">
                      {pack.credits} full {pack.credits === 1 ? 'analysis' : 'analyses'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                    <span className="text-base font-semibold tabular-nums text-v-on">
                      ${pack.price_usd}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBuy(pack.id)}
                      disabled={loadingPack != null}
                      className={cn(
                        'inline-flex h-8 min-w-[5.5rem] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors disabled:opacity-60',
                        highlighted
                          ? 'bg-[#238636] text-white hover:bg-[#2ea043]'
                          : 'border border-white/14 bg-white/[0.03] text-v-on hover:border-white/25 hover:bg-white/[0.06]',
                      )}
                    >
                      {buying ? 'Redirecting…' : 'Buy'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {error && (
          <p className="border-t border-v-error/20 bg-v-error/10 px-5 py-2.5 text-sm text-v-error">
            {error}
          </p>
        )}

        {/* Footer — GitHub dialog actions */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.08] bg-v-bg/40 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingPack != null}
            className="inline-flex h-8 items-center justify-center rounded-md border border-white/14 bg-white/[0.03] px-3 text-xs font-semibold text-v-on transition-colors hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

/** @deprecated use PricingModal */
export const PaywallModal = PricingModal
