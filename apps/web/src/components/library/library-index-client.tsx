'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { LibraryArticleCard } from '@/components/library/library-article-card'
import type { LibraryArticleSummary } from '@/lib/api/library'

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Most viewed' },
  { id: 'reviews', label: 'Most reviews' },
] as const

export interface LibraryFilters {
  q: string
  category: string
  saturation: string
  sort: 'latest' | 'popular' | 'reviews'
}

interface LibraryIndexClientProps {
  items: LibraryArticleSummary[]
  total: number
  categories: string[]
  filters: LibraryFilters
}

export function LibraryIndexClient({ items, total, categories, filters }: LibraryIndexClientProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [query, setQuery] = useState(filters.q)
  const [category, setCategory] = useState(filters.category)
  const [saturation, setSaturation] = useState(filters.saturation)
  const [sort, setSort] = useState(filters.sort)

  useEffect(() => {
    setQuery(filters.q)
    setCategory(filters.category)
    setSaturation(filters.saturation)
    setSort(filters.sort)
    setPending(false)
  }, [filters.q, filters.category, filters.saturation, filters.sort])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)

    const params = new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) params.set('q', trimmed)
    if (category) params.set('category', category)
    if (saturation) params.set('saturation', saturation)
    if (sort && sort !== 'latest') params.set('sort', sort)

    const qs = params.toString()
    router.push(qs ? `/library?${qs}` : '/library')
  }

  function handleReset() {
    setQuery('')
    setCategory('')
    setSaturation('')
    setSort('latest')
    setPending(true)
    router.push('/library')
  }

  const hasFilters = Boolean(filters.q || filters.category || filters.saturation || filters.sort !== 'latest')

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search research…"
          className="flex-1 min-w-[200px] text-sm border border-zinc-200 px-3 py-2 focus:outline-none focus:border-zinc-400"
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-zinc-200 px-3 py-2 bg-white focus:outline-none focus:border-zinc-400"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="saturation"
          value={saturation}
          onChange={(e) => setSaturation(e.target.value)}
          className="text-sm border border-zinc-200 px-3 py-2 bg-white focus:outline-none focus:border-zinc-400"
        >
          <option value="">Any competition</option>
          <option value="HIGH">High saturation</option>
          <option value="MEDIUM">Medium saturation</option>
          <option value="LOW">Low saturation</option>
        </select>
        <select
          name="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as LibraryFilters['sort'])}
          className="text-sm border border-zinc-200 px-3 py-2 bg-white focus:outline-none focus:border-zinc-400"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-medium bg-zinc-950 text-white px-4 py-2 hover:bg-zinc-800 transition-colors disabled:opacity-60"
        >
          {pending ? 'Searching…' : 'Search'}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-zinc-500 hover:text-zinc-800 px-2"
          >
            Clear
          </button>
        )}
      </form>

      {filters.q && (
        <p className="text-xs text-zinc-500 mb-3">
          Results for &ldquo;{filters.q}&rdquo;
        </p>
      )}

      <p className="text-xs text-zinc-400 font-mono mb-4">
        {pending ? 'Searching…' : `${total} research${total === 1 ? '' : 'es'}`}
      </p>

      {items.length === 0 && !pending ? (
        <div className="border border-dashed border-zinc-200 p-12 text-center">
          <p className="text-sm text-zinc-500">
            {hasFilters
              ? 'No published research matches your search.'
              : 'No published research yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((article) => (
            <LibraryArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
