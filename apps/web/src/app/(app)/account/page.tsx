import { redirect } from 'next/navigation'
import { AccountView } from '@/components/account-view'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Account — Vantage',
}

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  return <AccountView userEmail={user.email} />
}
