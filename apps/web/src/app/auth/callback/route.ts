import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles auth email links:
 * - PKCE `?code=` (+ optional `flow=recovery|confirm`)
 * - OTP `?token_hash=&type=recovery|signup|email|…` (recommended for custom templates)
 *
 * `type=email` / magiclink = login verification (keep session).
 * `type=signup` / invite = account confirmation (sign out → login banner).
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
  const isSignupConfirm = flow === 'confirm' || type === 'signup' || type === 'invite'
  const isLoginEmail = type === 'email' || type === 'magiclink'

  const safeNext =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'

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
      if (isSignupConfirm) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      if (isLoginEmail) {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }
      return NextResponse.redirect(`${origin}${safeNext}`)
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
    }
    if (isLoginEmail) {
      return NextResponse.redirect(`${origin}/login?error=login_otp_failed`)
    }
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      if (isSignupConfirm) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      // Login magic-link / PKCE without confirm flow → app.
      return NextResponse.redirect(`${origin}${safeNext}`)
    }

    if (isRecovery) {
      return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
    }
    if (flow === 'confirm') {
      return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
    }
    return NextResponse.redirect(`${origin}/login?error=login_otp_failed`)
  }

  // No usable token — send users to the right recovery/confirm entry.
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password`)
  }
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
