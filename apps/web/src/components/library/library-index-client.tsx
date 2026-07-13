'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { FunnelSimple, MagnifyingGlass, X } from '@phosphor-icons/react'
import { LibraryArticleCard } from '@/components/library/library-article-card'
import type { LibraryArticleSummary } from '@/lib/api/library'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Most viewed' },
  { id: 'reviews', label: 'Most reviews' },
] as const

const SATURATION_OPTIONS = [
  { id: '', label: 'Any competition' },
  { id: 'HIGH', label: 'High saturation' },
  { id: 'MEDIUM', label: 'Medium saturation' },
  { id: 'LOW', label: 'Low saturation' },
] as const

const selectClass =
  'h-9 w-full appearance-none rounded-md border border-white/12 bg-v-bg px-3 pr-8 text-sm text-v-on outline-none transition-colors focus:border-v-primary/45'

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

function buildLibraryUrl(next: {
  q: string
  category: string
  saturation: string
  sort: LibraryFilters['sort']
}) {
  const params = new URLSearchParams()
  const trimmed = next.q.trim()
  if (trimmed) params.set('q', trimmed)
  if (next.category) params.set('category', next.category)
  if (next.saturation) params.set('saturation', next.saturation)
  if (next.sort && next.sort !== 'latest') params.set('sort', next.sort)
  const qs = params.toString()
  return qs ? `/library?${qs}` : '/library'
}

export function LibraryIndexClient({ items, total, categories, filters }: LibraryIndexClientProps) {
  const router = useRouter()
  const filtersTitleId = useId()
  const [pending, setPending] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
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

  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [filtersOpen])

  function navigate(next: {
    q: string
    category: string
    saturation: string
    sort: LibraryFilters['sort']
  }) {
    setPending(true)
    setFiltersOpen(false)
    router.push(buildLibraryUrl(next))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    navigate({ q: query, category, saturation, sort })
  }

  function handleReset() {
    setQuery('')
    setCategory('')
    setSaturation('')
    setSort('latest')
    navigate({ q: '', category: '', saturation: '', sort: 'latest' })
  }

  function removeChip(kind: 'q' | 'category' | 'saturation' | 'sort') {
    const next = {
      q: kind === 'q' ? '' : filters.q,
      category: kind === 'category' ? '' : filters.category,
      saturation: kind === 'saturation' ? '' : filters.saturation,
      sort: kind === 'sort' ? ('latest' as const) : filters.sort,
    }
    setQuery(next.q)
    setCategory(next.category)
    setSaturation(next.saturation)
    setSort(next.sort)
    navigate(next)
  }

  const activeFilterCount = [
    filters.category,
    filters.saturation,
    filters.sort !== 'latest' ? filters.sort : '',
  ].filter(Boolean).length

  const hasFilters = Boolean(
    filters.q || filters.category || filters.saturation || filters.sort !== 'latest',
  )

  const saturationLabel =
    SATURATION_OPTIONS.find((o) => o.id === filters.saturation)?.label ?? filters.saturation
  const sortLabel = SORT_OPTIONS.find((o) => o.id === filters.sort)?.label ?? filters.sort

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mb-4 border-b border-white/[0.06] pb-4"
        role="search"
        aria-label="Filter research library"
      >
        {/* Primary search row — GitHub-style */}
        <div className="flex items-stretch gap-1.5 sm:gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-v-muted">
              <MagnifyingGlass size={16} weight="bold" aria-hidden />
            </span>
            <input
              name="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search research…"
              aria-label="Search research"
              className="h-10 w-full rounded-md border border-white/12 bg-v-bg py-2 pr-3 pl-9 text-sm text-v-on outline-none transition-colors placeholder:text-v-muted focus:border-v-primary/45 focus:ring-1 focus:ring-v-primary/20"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={cn(
              'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors md:hidden',
              activeFilterCount > 0
                ? 'border-v-primary/40 bg-v-primary/10 text-v-on'
                : 'border-white/12 text-v-muted hover:border-white/25 hover:text-v-on',
            )}
            aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
            aria-expanded={filtersOpen}
            aria-controls="library-filters-sheet"
          >
            <FunnelSimple size={18} weight="bold" aria-hidden />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-v-primary px-0.5 font-landing-mono text-[9px] font-medium text-v-bg">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-v-on px-3 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 disabled:opacity-60 sm:px-4"
          >
            {pending ? '…' : 'Search'}
          </button>
        </div>

        {/* Desktop filters row — GitHub repo filter bar */}
        <div className="mt-3 hidden gap-2 md:grid md:grid-cols-3">
          <label className="relative min-w-0">
            <span className="sr-only">Category</span>
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
              className={selectClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="relative min-w-0">
            <span className="sr-only">Saturation</span>
            <select
              name="saturation"
              value={saturation}
              onChange={(e) => setSaturation(e.target.value)}
              aria-label="Saturation"
              className={selectClass}
            >
              {SATURATION_OPTIONS.map((o) => (
                <option key={o.id || 'any'} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="relative min-w-0">
            <span className="sr-only">Sort</span>
            <select
              name="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as LibraryFilters['sort'])}
              aria-label="Sort"
              className={selectClass}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filters.q && (
            <FilterChip label={`“${filters.q}”`} onRemove={() => removeChip('q')} />
          )}
          {filters.category && (
            <FilterChip label={filters.category} onRemove={() => removeChip('category')} />
          )}
          {filters.saturation && (
            <FilterChip label={saturationLabel} onRemove={() => removeChip('saturation')} />
          )}
          {filters.sort !== 'latest' && (
            <FilterChip label={sortLabel} onRemove={() => removeChip('sort')} />
          )}
          <button
            type="button"
            onClick={handleReset}
            className="h-7 px-1.5 text-xs text-v-muted transition-colors hover:text-v-on"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
          {pending ? 'Searching…' : `${total} research${total === 1 ? '' : 'es'}`}
        </p>
        {/* Compact sort on mobile result bar */}
        <label className="flex items-center gap-2 md:hidden">
          <span className="text-xs text-v-muted">Sort</span>
          <select
            value={filters.sort}
            aria-label="Sort results"
            onChange={(e) => {
              const nextSort = e.target.value as LibraryFilters['sort']
              setSort(nextSort)
              navigate({
                q: filters.q,
                category: filters.category,
                saturation: filters.saturation,
                sort: nextSort,
              })
            }}
            className="h-8 rounded-md border border-white/12 bg-v-bg px-2 text-xs text-v-on outline-none focus:border-v-primary/45"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items.length === 0 && !pending ? (
        <div className="border border-dashed border-white/12 px-4 py-12 text-center sm:px-6 sm:py-14">
          <p className="text-sm text-v-muted">
            {hasFilters
              ? 'No published research matches your search.'
              : 'No published research yet.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 text-sm text-v-primary transition-opacity hover:opacity-80"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {items.map((article) => (
            <LibraryArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Mobile filters sheet — GitHub mobile filter pattern */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden" id="library-filters-sheet">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={filtersTitleId}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl border border-white/[0.08] bg-v-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 id={filtersTitleId} className="text-base font-semibold text-v-on">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-md p-2 text-v-muted hover:bg-white/5 hover:text-v-on"
                aria-label="Close filters"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-v-muted">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Category"
                  className={selectClass}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-v-muted">Saturation</span>
                <select
                  value={saturation}
                  onChange={(e) => setSaturation(e.target.value)}
                  aria-label="Saturation"
                  className={selectClass}
                >
                  {SATURATION_OPTIONS.map((o) => (
                    <option key={o.id || 'any'} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-v-muted">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as LibraryFilters['sort'])}
                  aria-label="Sort"
                  className={selectClass}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-white/14 text-sm font-medium text-v-muted transition-colors hover:text-v-on"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => navigate({ q: query, category, saturation, sort })}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-v-on text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-v-bg px-2.5 text-xs text-v-on transition-colors hover:border-white/25"
    >
      <span className="truncate">{label}</span>
      <X size={12} weight="bold" className="shrink-0 text-v-muted" aria-hidden />
      <span className="sr-only">Remove filter</span>
    </button>
  )
}
