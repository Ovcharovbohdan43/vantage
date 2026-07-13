import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { LibraryHeader } from '@/components/library/library-header'

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    return <AppShell userEmail={user.email}>{children}</AppShell>
  }

  return (
    <div className="landing-root min-h-screen bg-v-bg">
      <LibraryHeader />
      <main>{children}</main>
    </div>
  )
}
