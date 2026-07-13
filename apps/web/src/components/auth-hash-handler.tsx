'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Legacy Supabase email links land on Site URL with a hash:
 * `#access_token=…&type=recovery&…`
 * Without this, users appear stuck on the marketing home page.
 */
export function AuthHashHandler() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const { hash } = window.location
    if (!hash || hash.length < 2) return
    if (!hash.includes('access_token') && !hash.includes('refresh_token')) return

    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const type = params.get('type')

    const supabase = createClient()
    void (async () => {
      // Browser client picks up the session from the URL hash.
      await supabase.auth.getSession()
      const cleanPath = window.location.pathname + window.location.search
      window.history.replaceState({}, '', cleanPath || '/')

      if (type === 'recovery') {
        router.replace('/reset-password')
        return
      }
      if (type === 'signup' || type === 'email' || type === 'invite') {
        await supabase.auth.signOut()
        router.replace('/login?confirmed=true')
        return
      }
      router.replace('/dashboard')
    })()
  }, [router])

  return null
}
