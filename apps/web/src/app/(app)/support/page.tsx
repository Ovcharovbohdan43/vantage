import { redirect } from 'next/navigation'
import { SupportView } from '@/components/support-view'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Support — Vantage',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  return <SupportView />
}
