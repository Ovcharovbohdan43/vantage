'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getLibraryReviews, type LibraryReview } from '@/lib/api/library'

const PAGE_SIZE = 20

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

function ReviewCard({ review }: { review: LibraryReview }) {
  return (
    <div className="border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] font-mono uppercase text-zinc-400">
        {review.rating != null && (
          <span className="text-amber-600">{'★'.repeat(review.rating)}</span>
        )}
        <span>{review.product}</span>
        <span>{review.source.toUpperCase()}</span>
      </div>
      <p className="text-sm text-zinc-800 leading-relaxed">{review.text}</p>
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div className="border border-zinc-100 p-4 space-y-2">
      <div className="h-3 w-24 bg-zinc-100 animate-pulse" />
      <div className="h-3 w-full bg-zinc-100 animate-pulse" />
      <div className="h-3 w-4/5 bg-zinc-100 animate-pulse" />
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
        const data = await getLibraryReviews(slug, buildParams(offset))
        setTotal(data.total)
        nextOffsetRef.current = offset + data.items.length
        setHasMore(nextOffsetRef.current < data.total)
        setReviews((prev) =>
          append ? mergeUniqueReviews(prev, data.items) : data.items,
        )
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

  // Reset and load first page when filters change
  useEffect(() => {
    setReviews([])
    setHasMore(false)
    nextOffsetRef.current = 0
    loadPage(0, false)
  }, [loadPage])

  // Infinite scroll sentinel
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
      <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
        Every negative review collected for this analysis — anonymized, no authors or personal data.
        Reviews load in batches as you scroll.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="text-sm border border-zinc-200 px-3 py-2 bg-white"
        >
          <option value="">All ratings</option>
          <option value="1">★1 only</option>
          <option value="2">★2 only</option>
          <option value="3">★3 only</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reviews…"
          className="flex-1 min-w-[180px] text-sm border border-zinc-200 px-3 py-2"
        />
        {clusterId && (
          <button
            type="button"
            onClick={() => setClusterId('')}
            className="text-xs text-zinc-500 underline"
          >
            Clear pain filter
          </button>
        )}
      </div>

      <p className="text-xs font-mono text-zinc-400 mb-4">
        {loading && shown === 0
          ? 'Loading evidence…'
          : total > 0
            ? `Showing ${shown} of ${total} review${total === 1 ? '' : 's'}`
            : 'No reviews'}
      </p>

      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
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
          <p className="text-sm text-zinc-500 text-center py-8">No reviews match your filters.</p>
        )}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />

      {!loading && !hasMore && shown > 0 && (
        <p className="text-xs text-zinc-400 text-center mt-6 font-mono">All reviews loaded</p>
      )}
    </div>
  )
}
