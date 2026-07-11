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

const fieldClass =
  'rounded-lg border border-white/12 bg-[#1c1b1d] px-3 py-2 text-sm text-[#e5e1e4] outline-none transition-colors focus:border-[#d0bcff]/45'

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

  const hasFilters = Boolean(
    filters.q || filters.category || filters.saturation || filters.sort !== 'latest',
  )

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-3">
        <input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search research…"
          className={`min-w-[200px] flex-1 ${fieldClass} placeholder:text-[#958ea0]`}
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={fieldClass}
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
          className={fieldClass}
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
          className={fieldClass}
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
          className="landing-primary-glow rounded-lg bg-[#d0bcff] px-4 py-2 text-sm font-semibold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? 'Searching…' : 'Search'}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="px-2 text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
          >
            Clear
          </button>
        )}
      </form>

      {filters.q && (
        <p className="mb-3 text-xs text-[#cbc3d7]">
          Results for &ldquo;{filters.q}&rdquo;
        </p>
      )}

      <p className="mb-4 font-mono text-xs text-[#958ea0]">
        {pending ? 'Searching…' : `${total} research${total === 1 ? '' : 'es'}`}
      </p>

      {items.length === 0 && !pending ? (
        <div className="rounded-xl border border-dashed border-white/15 p-12 text-center">
          <p className="text-sm text-[#cbc3d7]">
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
