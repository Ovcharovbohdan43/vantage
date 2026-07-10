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
    if (credits.total_credits > 0) parts.push(`${credits.total_credits} credit${credits.total_credits === 1 ? '' : 's'}`)
    return (
      <div className={cn('text-[10px] text-zinc-400', className)}>
        {parts.length > 0 ? parts.join(' · ') : 'No credits'}
      </div>
    )
  }

  return (
    <div className={cn('border border-zinc-200 p-4', className)}>
      <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">Research credits</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {credits.free_preview_available && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Free preview</p>
            <p className="font-semibold text-zinc-950">Available</p>
          </div>
        )}
        <div className={credits.free_preview_available ? '' : 'col-span-2'}>
          <p className="text-zinc-500 text-xs mb-1">Credits balance</p>
          <p className="font-semibold tabular-nums text-zinc-950">{credits.total_credits}</p>
        </div>
      </div>
      {credits.total_credits > 0 && credits.depth_credit_costs && (
        <p className="text-[10px] text-zinc-400 mt-3 font-mono">
          Depth: shallow {credits.depth_credit_costs.shallow ?? 1} · standard{' '}
          {credits.depth_credit_costs.standard ?? 2} · deep {credits.depth_credit_costs.deep ?? 3}
        </p>
      )}
      {(credits.starter_credits > 0 || credits.founder_credits > 0 || credits.indie_credits > 0) && (
        <p className="text-[10px] text-zinc-400 mt-3 font-mono">
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
