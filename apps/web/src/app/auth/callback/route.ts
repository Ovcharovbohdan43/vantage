import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles auth email links:
 * - PKCE `?code=` (+ optional `flow=recovery|confirm`)
 * - OTP `?token_hash=&type=recovery|signup|…` (recommended for custom templates)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')
  const flow = searchParams.get('flow')
  const nextPath = searchParams.get('next')

  const type = typeParam as EmailOtpType | null
  const isRecovery = flow === 'recovery' || type === 'recovery'
  const isConfirm =
    flow === 'confirm' || type === 'signup' || type === 'email' || type === 'invite'

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      if (type === 'signup' || type === 'email' || type === 'invite') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      if (nextPath?.startsWith('/')) {
        return NextResponse.redirect(`${origin}${nextPath}`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
    }
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      if (isConfirm) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      if (nextPath?.startsWith('/')) {
        return NextResponse.redirect(`${origin}${nextPath}`)
      }
      // Ambiguous code without flow/type — prefer dashboard for signed-in sessions.
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    if (isRecovery) {
      return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
    }
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  // No usable token — send users to the right recovery/confirm entry.
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password`)
  }
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
