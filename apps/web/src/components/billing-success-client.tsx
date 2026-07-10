'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PiggyBank } from '@phosphor-icons/react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fulfillCheckoutSession } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { ResearchPack } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const PACK_COPY: Record<ResearchPack, { label: string; tagline: string }> = {
  starter: {
    label: 'Starter Research',
    tagline: 'One full market analysis — quotes, pain map, and a build/pivot verdict.',
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
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-16">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-amber-100/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Hero */}
          <div
            className={cn(
              'relative px-8 pt-10 pb-8 text-center border-b border-zinc-100',
              isError ? 'bg-red-50/50' : 'bg-gradient-to-b from-emerald-50/80 to-white',
            )}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
              className="relative mx-auto mb-5 w-fit"
            >
              <div
                className={cn(
                  'w-20 h-20 flex items-center justify-center border-2',
                  isError
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                )}
              >
                {isLoading ? (
                  <Loader2 size={32} className="animate-spin text-emerald-700" aria-hidden />
                ) : (
                  <PiggyBank size={40} weight="duotone" aria-hidden />
                )}
              </div>
              {!isLoading && !isError && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35, type: 'spring', stiffness: 400 }}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-600 text-white flex items-center justify-center border-2 border-white"
                  aria-hidden
                >
                  <Check size={14} strokeWidth={2.5} />
                </motion.span>
              )}
            </motion.div>

            <p
              className={cn(
                'text-xs font-mono uppercase tracking-widest mb-2',
                isError ? 'text-red-600' : 'text-emerald-700',
              )}
            >
              {isLoading ? 'Processing payment' : isError ? 'Confirmation issue' : 'Payment received'}
            </p>

            <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
              {isLoading && 'Adding your credits…'}
              {isError && 'Almost there'}
              {!isLoading && !isError && 'Credits added'}
            </h1>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            {isLoading && (
              <div className="space-y-3 text-center">
                <div className="h-1.5 bg-zinc-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-600"
                    initial={{ width: '0%' }}
                    animate={{ width: '70%' }}
                    transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
                  />
                </div>
                <p className="text-sm text-zinc-500">Confirming with Stripe — usually takes a few seconds.</p>
              </div>
            )}

            {isError && (
              <p className="text-sm text-red-700 text-center leading-relaxed mb-6">
                {message ?? 'Something went wrong confirming your payment.'}
                <span className="block mt-2 text-zinc-500 text-xs">
                  If you were charged, credits may still arrive via webhook. Check your dashboard in a minute.
                </span>
              </p>
            )}

            {!isLoading && !isError && (
              <div className="space-y-5">
                {creditsAdded != null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center py-4 border border-emerald-200 bg-emerald-50/60"
                  >
                    <p className="text-3xl font-semibold tabular-nums text-zinc-950 leading-none">
                      +{creditsAdded}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      credit{creditsAdded === 1 ? '' : 's'} added
                      {totalCredits != null && (
                        <span className="text-zinc-400"> · {totalCredits} total</span>
                      )}
                    </p>
                  </motion.div>
                )}

                {packInfo && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-950">{packInfo.label}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{packInfo.tagline}</p>
                  </div>
                )}

                {!sessionId && (
                  <p className="text-sm text-zinc-500 text-center leading-relaxed">
                    Payment received. Credits may take a moment if the webhook is still processing.
                  </p>
                )}

                <p className="text-sm text-zinc-600 text-center leading-relaxed border-t border-zinc-100 pt-5">
                  You&apos;re ready to find out if your next idea is worth building.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 mt-7">
              <Button
                type="button"
                className="w-full h-11 gap-2"
                disabled={isBusy}
                onClick={() => goTo('new')}
              >
                {navigatingTo === 'new' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                    Opening…
                  </>
                ) : (
                  'Validate an idea'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2"
                disabled={isBusy}
                onClick={() => goTo('dashboard')}
              >
                {navigatingTo === 'dashboard' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                    Loading…
                  </>
                ) : (
                  'Back to dashboard'
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-4 font-mono">
          Secure payment via Stripe
        </p>
      </motion.div>
    </div>
  )
}
