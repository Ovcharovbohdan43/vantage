import { notFound, redirect } from 'next/navigation'
import { BlogEditor } from '@/components/blog/blog-editor'
import { getBlogPostServer } from '@/lib/api/blog-server'
import { createClient } from '@/lib/supabase/server'
import { isBlogOwner } from '@/lib/blog-owner'

export const metadata = {
  title: 'Edit post',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isBlogOwner(user)) {
    redirect('/blog')
  }

  const post = await getBlogPostServer(slug)
  if (!post) {
    notFound()
  }

  return (
    <div className="px-4 py-8 sm:px-5 md:px-8">
      <BlogEditor mode="edit" initial={post} />
    </div>
  )
}
