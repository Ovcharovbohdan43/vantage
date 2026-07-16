import { redirect } from 'next/navigation'
import { BlogEditor } from '@/components/blog/blog-editor'
import { createClient } from '@/lib/supabase/server'
import { isBlogOwner } from '@/lib/blog-owner'

export const metadata = {
  title: 'New post',
  robots: { index: false, follow: false },
}

export default async function NewBlogPostPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isBlogOwner(user)) {
    redirect('/blog')
  }

  return (
    <div className="px-4 py-8 sm:px-5 md:px-8">
      <BlogEditor mode="create" />
    </div>
  )
}
