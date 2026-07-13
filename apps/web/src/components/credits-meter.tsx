'use client'

import type { CreditsBalance } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface CreditsMeterProps {
  credits: CreditsBalance
  className?: string
  compact?: boolean
  /** GitHub-style ghost Buy credits control in the meter header. */
  onBuyCredits?: () => void
}

export function CreditsMeter({
  credits,
  className,
  compact = false,
  onBuyCredits,
}: CreditsMeterProps) {
  if (compact) {
    const parts = []
    if (credits.free_preview_available) parts.push('1 free preview')
    if (credits.total_credits > 0)
      parts.push(`${credits.total_credits} credit${credits.total_credits === 1 ? '' : 's'}`)
    return (
      <div className={cn('flex items-center gap-2 text-[10px] text-v-muted', className)}>
        <span>{parts.length > 0 ? parts.join(' · ') : 'No credits'}</span>
        {onBuyCredits && (
          <button
            type="button"
            onClick={onBuyCredits}
            className="rounded border border-white/14 px-1.5 py-0.5 text-[10px] font-medium text-v-on transition-colors hover:border-white/28 hover:bg-white/[0.04]"
          >
            Buy
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-white/[0.08] bg-v-surface',
        className,
      )}
    >
      {/* GitHub settings-section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-v-on">Research credits</h2>
          <p className="mt-0.5 text-xs text-v-muted">
            Credits power full market analyses. They never expire.
          </p>
        </div>
        {onBuyCredits && (
          <button
            type="button"
            onClick={onBuyCredits}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-white/14 bg-white/[0.03] px-3 text-xs font-semibold text-v-on transition-colors hover:border-white/25 hover:bg-white/[0.06]"
          >
            Buy credits
          </button>
        )}
      </div>

      <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-1 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
            Balance
          </p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-v-on">
            {credits.total_credits}
            <span className="ml-1.5 text-sm font-normal text-v-muted">
              credit{credits.total_credits === 1 ? '' : 's'}
            </span>
          </p>
          {credits.free_preview_available && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-v-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-v-tertiary" aria-hidden />
              Free preview available
            </p>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-4 py-4 sm:border-t-0 sm:border-l sm:px-5">
          <p className="mb-2 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
            Depth cost
          </p>
          <ul className="space-y-1.5 font-landing-mono text-xs tabular-nums text-v-muted">
            <li className="flex justify-between gap-6">
              <span>Shallow</span>
              <span className="text-v-on">{credits.depth_credit_costs?.shallow ?? 1}</span>
            </li>
            <li className="flex justify-between gap-6">
              <span>Standard</span>
              <span className="text-v-on">{credits.depth_credit_costs?.standard ?? 2}</span>
            </li>
            <li className="flex justify-between gap-6">
              <span>Deep</span>
              <span className="text-v-on">{credits.depth_credit_costs?.deep ?? 3}</span>
            </li>
          </ul>
        </div>
      </div>

      {(credits.starter_credits > 0 ||
        credits.founder_credits > 0 ||
        credits.indie_credits > 0) && (
        <div className="border-t border-white/[0.06] px-4 py-2.5 font-landing-mono text-[11px] text-v-muted sm:px-5">
          {credits.starter_credits > 0 && `${credits.starter_credits} starter`}
          {credits.founder_credits > 0 &&
            `${credits.starter_credits > 0 ? ' · ' : ''}${credits.founder_credits} founder`}
          {credits.indie_credits > 0 &&
            `${credits.starter_credits > 0 || credits.founder_credits > 0 ? ' · ' : ''}${credits.indie_credits} indie`}
        </div>
      )}
    </div>
  )
}

/** @deprecated use CreditsMeter */
export const UsageMeter = CreditsMeter
