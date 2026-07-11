'use client'

import type { CreditsBalance } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface CreditsMeterProps {
  credits: CreditsBalance
  className?: string
  compact?: boolean
}

export function CreditsMeter({ credits, className, compact = false }: CreditsMeterProps) {
  if (compact) {
    const parts = []
    if (credits.free_preview_available) parts.push('1 free preview')
    if (credits.total_credits > 0)
      parts.push(`${credits.total_credits} credit${credits.total_credits === 1 ? '' : 's'}`)
    return (
      <div className={cn('text-[10px] text-[#958ea0]', className)}>
        {parts.length > 0 ? parts.join(' · ') : 'No credits'}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5 shadow-[0_0_32px_rgba(208,188,255,0.06)]',
        className,
      )}
    >
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#958ea0]">
        Research credits
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {credits.free_preview_available && (
          <div>
            <p className="mb-1 text-xs text-[#cbc3d7]">Free preview</p>
            <p className="font-semibold text-[#4edea3]">Available</p>
          </div>
        )}
        <div className={credits.free_preview_available ? '' : 'col-span-2'}>
          <p className="mb-1 text-xs text-[#cbc3d7]">Credits balance</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#d0bcff]">
            {credits.total_credits}
          </p>
        </div>
      </div>
      {credits.total_credits > 0 && credits.depth_credit_costs && (
        <p className="mt-3 font-mono text-[10px] text-[#958ea0]">
          Depth: shallow {credits.depth_credit_costs.shallow ?? 1} · standard{' '}
          {credits.depth_credit_costs.standard ?? 2} · deep {credits.depth_credit_costs.deep ?? 3}
        </p>
      )}
      {(credits.starter_credits > 0 || credits.founder_credits > 0 || credits.indie_credits > 0) && (
        <p className="mt-2 font-mono text-[10px] text-[#958ea0]">
          {credits.starter_credits > 0 && `${credits.starter_credits} starter`}
          {credits.founder_credits > 0 && ` · ${credits.founder_credits} founder`}
          {credits.indie_credits > 0 && ` · ${credits.indie_credits} indie`}
        </p>
      )}
    </div>
  )
}

/** @deprecated use CreditsMeter */
export const UsageMeter = CreditsMeter
