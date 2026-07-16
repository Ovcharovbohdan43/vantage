'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  createBlogPost,
  deleteBlogPost,
  updateBlogPost,
  type BlogPost,
  type BlogPostInput,
} from '@/lib/api/blog'
import { ApiError } from '@/lib/api/client'

interface BlogEditorProps {
  mode: 'create' | 'edit'
  initial?: BlogPost
}

export function BlogEditor({ mode, initial }: BlogEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [bodyMd, setBodyMd] = useState(initial?.body_md ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status === 'published' ? 'published' : 'draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(nextStatus: 'draft' | 'published') {
    setSaving(true)
    setError(null)
    const payload: BlogPostInput = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      body_md: bodyMd,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status: nextStatus,
      slug: slug.trim() || undefined,
    }

    try {
      if (mode === 'create') {
        const created = await createBlogPost(payload)
        router.push(`/blog/${created.slug}`)
        router.refresh()
        return
      }
      const updated = await updateBlogPost(initial!.slug, payload)
      router.push(`/blog/${updated.slug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save post')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial || !confirm('Delete this post permanently?')) return
    setSaving(true)
    try {
      await deleteBlogPost(initial.slug)
      router.push('/blog')
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete post')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 border-b border-white/[0.06] pb-6">
        <p className="font-landing-mono text-[10px] uppercase tracking-[0.2em] text-v-muted">
          {mode === 'create' ? 'New post' : 'Edit post'}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-v-on">
          {mode === 'create' ? 'Write for the wall' : initial?.title}
        </h1>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-v-on outline-none focus:border-v-primary/40"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Slug (optional)
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-from-title"
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-landing-mono text-sm text-v-on outline-none focus:border-v-primary/40"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Excerpt
          </span>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-v-on outline-none focus:border-v-primary/40"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Tags (comma-separated)
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="startups, research"
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-v-on outline-none focus:border-v-primary/40"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Body (Markdown)
          </span>
          <textarea
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            rows={18}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-landing-mono text-[13px] leading-relaxed text-v-on outline-none focus:border-v-primary/40"
          />
        </label>

        {error && <p className="text-sm text-v-error">{error}</p>}

        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-5">
          <button
            type="button"
            disabled={saving || !title.trim() || !bodyMd.trim()}
            onClick={() => save('published')}
            className="inline-flex h-9 items-center rounded-md bg-v-on px-4 text-sm font-medium text-v-bg disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={saving || !title.trim() || !bodyMd.trim()}
            onClick={() => save('draft')}
            className="inline-flex h-9 items-center rounded-md border border-white/[0.08] px-4 text-sm text-v-on disabled:opacity-50"
          >
            Save draft
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              disabled={saving}
              onClick={remove}
              className="inline-flex h-9 items-center px-4 text-sm text-v-error disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
