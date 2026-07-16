import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { BlogHeader } from '@/components/blog/blog-header'

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    return <AppShell userEmail={user.email}>{children}</AppShell>
  }

  return (
    <div className="landing-root min-h-screen bg-v-bg">
      <BlogHeader />
      <main>{children}</main>
    </div>
  )
}
