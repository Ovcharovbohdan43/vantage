'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getLibraryReviews, type LibraryReview } from '@/lib/api/library'

const PAGE_SIZE = 20

const fieldClass =
  'rounded-lg border border-white/12 bg-[#1c1b1d] px-3 py-2 text-sm text-[#e5e1e4] outline-none transition-colors focus:border-[#d0bcff]/45'

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
    <div className="rounded-xl border border-white/10 bg-[#1c1b1d]/60 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase text-[#958ea0]">
        {review.rating != null && (
          <span className="text-[#ff8adf]">{'★'.repeat(review.rating)}</span>
        )}
        <span>{review.product}</span>
        <span>{review.source.toUpperCase()}</span>
      </div>
      <p className="text-sm leading-relaxed text-[#e5e1e4]">{review.text}</p>
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-white/8 p-4">
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
        const data = await getLibraryReviews(slug, buildParams(offset))
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
      <p className="mb-4 text-sm leading-relaxed text-[#cbc3d7]">
        Every negative review collected for this analysis — anonymized, no authors or personal data.
        Reviews load in batches as you scroll.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <select value={rating} onChange={(e) => setRating(e.target.value)} className={fieldClass}>
          <option value="">All ratings</option>
          <option value="1">★1 only</option>
          <option value="2">★2 only</option>
          <option value="3">★3 only</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reviews…"
          className={`min-w-[180px] flex-1 ${fieldClass} placeholder:text-[#958ea0]`}
        />
        {clusterId && (
          <button
            type="button"
            onClick={() => setClusterId('')}
            className="text-xs text-[#958ea0] underline transition-colors hover:text-[#d0bcff]"
          >
            Clear pain filter
          </button>
        )}
      </div>

      <p className="mb-4 font-mono text-xs text-[#958ea0]">
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
          <p className="py-8 text-center text-sm text-[#cbc3d7]">No reviews match your filters.</p>
        )}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />

      {!loading && !hasMore && shown > 0 && (
        <p className="mt-6 text-center font-mono text-xs text-[#958ea0]">All reviews loaded</p>
      )}
    </div>
  )
}
