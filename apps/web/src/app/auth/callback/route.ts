import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const flow = searchParams.get('flow')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (flow === 'confirm') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }

      if (flow === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      const next = searchParams.get('next') ?? '/dashboard'
      return NextResponse.redirect(`${origin}${next}`)
    }

    if (flow === 'recovery') {
      return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
