'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { getLibraryReviewsFromBrowser } from '@/lib/api/library-browser'
import type { LibraryReview } from '@/lib/api/library'

const PAGE_SIZE = 20

const fieldClass =
  'h-9 w-full rounded-md border border-white/12 bg-v-bg px-3 text-sm text-v-on outline-none transition-colors focus:border-v-primary/45 focus:ring-1 focus:ring-v-primary/20'

function mergeUniqueReviews(prev: LibraryReview[], next: LibraryReview[]): LibraryReview[] {
  const seen = new Set(prev.map((r) => r.id))
  const merged = [...prev]
  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
}

interface LibraryEvidenceProps {
  slug: string
  initialClusterId?: string | null
}

function ReviewRow({ review }: { review: LibraryReview }) {
  return (
    <article className="border-b border-white/[0.06] px-1 py-4 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-center gap-2 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
        {review.rating != null && (
          <span className="text-v-warn" aria-label={`${review.rating} stars`}>
            {'★'.repeat(review.rating)}
          </span>
        )}
        <span>{review.product}</span>
        <span>{review.source.toUpperCase()}</span>
      </div>
      <p className="text-sm leading-relaxed text-v-on">{review.text}</p>
    </article>
  )
}

function ReviewSkeleton() {
  return (
    <div className="space-y-2 border-b border-white/[0.06] py-4">
      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-full animate-pulse rounded bg-white/10" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
    </div>
  )
}

export function LibraryEvidence({ slug, initialClusterId }: LibraryEvidenceProps) {
  const [reviews, setReviews] = useState<LibraryReview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [rating, setRating] = useState('')
  const [clusterId, setClusterId] = useState(initialClusterId ?? '')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const nextOffsetRef = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (initialClusterId) setClusterId(initialClusterId)
  }, [initialClusterId])

  const buildParams = useCallback(
    (offset: number) => ({
      rating: rating ? Number(rating) : undefined,
      cluster_id: clusterId || undefined,
      q: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [rating, clusterId, debouncedSearch],
  )

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        if (loadingMoreRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await getLibraryReviewsFromBrowser(slug, buildParams(offset))
        setTotal(data.total)
        nextOffsetRef.current = offset + data.items.length
        setHasMore(nextOffsetRef.current < data.total)
        setReviews((prev) => (append ? mergeUniqueReviews(prev, data.items) : data.items))
      } finally {
        if (append) {
          loadingMoreRef.current = false
          setLoadingMore(false)
        } else {
          setLoading(false)
        }
      }
    },
    [slug, buildParams],
  )

  useEffect(() => {
    setReviews([])
    setHasMore(false)
    nextOffsetRef.current = 0
    loadPage(0, false)
  }, [loadPage])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || loading || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMoreRef.current && !loading) {
          loadPage(nextOffsetRef.current, true)
        }
      },
      { rootMargin: '240px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadPage])

  const shown = reviews.length

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-v-muted">
        Every negative review collected for this analysis — anonymized, no authors or personal data.
        Reviews load in batches as you scroll.
      </p>

      <div className="mb-4 space-y-2 border-b border-white/[0.06] pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-v-muted">
              <MagnifyingGlass size={16} weight="bold" aria-hidden />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews…"
              aria-label="Search reviews"
              type="search"
              className={`${fieldClass} pr-3 pl-9 placeholder:text-v-muted`}
            />
          </label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            aria-label="Filter by rating"
            className={`${fieldClass} sm:w-40 sm:shrink-0`}
          >
            <option value="">All ratings</option>
            <option value="1">★1 only</option>
            <option value="2">★2 only</option>
            <option value="3">★3 only</option>
          </select>
        </div>
        {clusterId && (
          <button
            type="button"
            onClick={() => setClusterId('')}
            className="h-8 text-xs text-v-muted underline underline-offset-2 transition-colors hover:text-v-on"
          >
            Clear pain filter
          </button>
        )}
      </div>

      <p className="mb-3 font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
        {loading && shown === 0
          ? 'Loading evidence…'
          : total > 0
            ? `Showing ${shown} of ${total} review${total === 1 ? '' : 's'}`
            : 'No reviews'}
      </p>

      <div className="border-y border-white/[0.06]">
        {reviews.map((review) => (
          <ReviewRow key={review.id} review={review} />
        ))}

        {loading && shown === 0 && (
          <>
            <ReviewSkeleton />
            <ReviewSkeleton />
            <ReviewSkeleton />
          </>
        )}

        {loadingMore && (
          <>
            <ReviewSkeleton />
            <ReviewSkeleton />
          </>
        )}

        {!loading && shown === 0 && (
          <p className="py-10 text-center text-sm text-v-muted">No reviews match your filters.</p>
        )}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />

      {!loading && !hasMore && shown > 0 && (
        <p className="mt-6 text-center font-landing-mono text-[11px] text-v-muted">
          All reviews loaded
        </p>
      )}
    </div>
  )
}
