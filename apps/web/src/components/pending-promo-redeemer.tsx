'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  clearPendingPromo,
  readPendingPromo,
  redeemPromoCode,
} from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'

/** Redeems a promo code stashed at signup after email confirmation / first login. */
export function PendingPromoRedeemer() {
  const queryClient = useQueryClient()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    const code = readPendingPromo()
    if (!code) return
    ran.current = true

    void (async () => {
      try {
        await redeemPromoCode(code)
        clearPendingPromo()
        await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
      } catch (err) {
        // Invalid / already used — drop the stash so we don't retry forever.
        if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
          clearPendingPromo()
        }
        ran.current = false
      }
    })()
  }, [queryClient])

  return null
}
