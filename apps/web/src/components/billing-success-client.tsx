'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { fulfillCheckoutSession } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { ResearchPack } from '@/lib/api/types'

const PACK_COPY: Record<ResearchPack, { label: string; tagline: string }> = {
  starter: {
    label: 'Starter Research',
    tagline: 'One full market analysis — quotes, pain map, and opportunity evidence.',
  },
  founder: {
    label: 'Founder Pack',
    tagline: 'Five deep dives to compare ideas before you commit months of work.',
  },
  indie: {
    label: 'Indie Hacker',
    tagline: 'Twenty validations for builders who ship constantly.',
  },
}

function isPack(value: string | null): value is ResearchPack {
  return value === 'starter' || value === 'founder' || value === 'indie'
}

export function BillingSuccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const sessionId = searchParams.get('session_id')
  const packParam = searchParams.get('pack')

  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null)
  const [totalCredits, setTotalCredits] = useState<number | null>(null)
  const [navigatingTo, setNavigatingTo] = useState<'new' | 'dashboard' | null>(null)

  function goTo(path: 'new' | 'dashboard') {
    setNavigatingTo(path)
    router.push(path === 'new' ? '/research/new' : '/dashboard')
  }

  useEffect(() => {
    if (!sessionId) {
      setStatus('done')
      return
    }

    let cancelled = false

    fulfillCheckoutSession(sessionId)
      .then((result) => {
        if (cancelled) return
        setCreditsAdded(result.credits_added)
        setTotalCredits(result.total_credits)
        setStatus('done')
        void queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
        void queryClient.invalidateQueries({ queryKey: ['credits'] })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus('error')
        setMessage(err instanceof ApiError ? err.message : 'Could not confirm payment')
      })

    return () => {
      cancelled = true
    }
  }, [sessionId, queryClient])

  const packInfo = isPack(packParam) ? PACK_COPY[packParam] : null
  const isLoading = status === 'loading'
  const isError = status === 'error'
  const isBusy = isLoading || navigatingTo != null

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-v-surface">
          <div className="border-b border-white/[0.06] px-6 py-8 text-center">
            <p className="mb-2 font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
              {isLoading ? 'Processing payment' : isError ? 'Confirmation issue' : 'Payment received'}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-v-on">
              {isLoading && 'Adding your credits…'}
              {isError && 'Almost there'}
              {!isLoading && !isError && 'Credits added'}
            </h1>
          </div>

          <div className="px-6 py-7">
            {isLoading && (
              <p className="text-center text-sm text-v-muted">
                Confirming with Stripe — usually takes a few seconds.
              </p>
            )}

            {isError && (
              <p className="mb-6 text-center text-sm leading-relaxed text-v-error">
                {message ?? 'Something went wrong confirming your payment.'}
                <span className="mt-2 block text-xs text-v-muted">
                  If you were charged, credits may still arrive via webhook. Check your dashboard in
                  a minute.
                </span>
              </p>
            )}

            {!isLoading && !isError && (
              <div className="space-y-5">
                {creditsAdded != null && (
                  <div className="border border-v-tertiary/25 bg-v-tertiary/8 py-4 text-center">
                    <p className="text-3xl font-semibold tabular-nums leading-none text-v-on">
                      +{creditsAdded}
                    </p>
                    <p className="mt-2 text-xs text-v-muted">
                      credit{creditsAdded === 1 ? '' : 's'} added
                      {totalCredits != null && (
                        <span className="text-v-muted/80"> · {totalCredits} total</span>
                      )}
                    </p>
                  </div>
                )}

                {packInfo && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-v-on">{packInfo.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-v-muted">{packInfo.tagline}</p>
                  </div>
                )}

                {!sessionId && (
                  <p className="text-center text-sm leading-relaxed text-v-muted">
                    Payment received. Credits may take a moment if the webhook is still processing.
                  </p>
                )}

                <p className="border-t border-white/[0.06] pt-5 text-center text-sm leading-relaxed text-v-muted">
                  You&apos;re ready to find out if your next idea is worth building.
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-2.5">
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-v-on text-sm font-medium text-v-bg transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={isBusy}
                onClick={() => goTo('new')}
              >
                {navigatingTo === 'new' ? 'Opening…' : 'Validate an idea'}
              </button>
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-white/14 text-sm font-medium text-v-on transition-colors hover:border-white/28 disabled:opacity-50"
                disabled={isBusy}
                onClick={() => goTo('dashboard')}
              >
                {navigatingTo === 'dashboard' ? 'Loading…' : 'Back to dashboard'}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center font-landing-mono text-[11px] text-v-muted">
          Secure payment via Stripe
        </p>
      </div>
    </div>
  )
}
