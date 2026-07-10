'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getProjectReviews, type ProjectReview } from '@/lib/api/reviews'
import { QuoteCard } from '@/components/report/report-competitors'
import type { ReportPainCluster } from '@/lib/api/types'

const PAGE_SIZE = 20

function mergeUniqueReviews(prev: ProjectReview[], next: ProjectReview[]): ProjectReview[] {
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

interface ProjectEvidenceProps {
  projectId: string
  initialClusterId?: string | null
  disabled?: boolean
  painClusters?: ReportPainCluster[]
}

function ReviewSkeleton() {
  return (
    <div className="border border-zinc-100 p-5 space-y-2">
      <div className="h-3 w-24 bg-zinc-100 animate-pulse" />
      <div className="h-3 w-full bg-zinc-100 animate-pulse" />
      <div className="h-3 w-4/5 bg-zinc-100 animate-pulse" />
    </div>
  )
}

export function ProjectEvidence({
  projectId,
  initialClusterId,
  disabled,
  painClusters = [],
}: ProjectEvidenceProps) {
  const [reviews, setReviews] = useState<ProjectReview[]>([])
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

  const clusterTitle = painClusters.find((c) => c.id === clusterId)?.title

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
      if (disabled) return

      if (append) {
        if (loadingMoreRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await getProjectReviews(projectId, buildParams(offset))
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
    [projectId, buildParams, disabled],
  )

  useEffect(() => {
    if (disabled) {
      setReviews([])
      setTotal(0)
      setHasMore(false)
      setLoading(false)
      return
    }
    setReviews([])
    setHasMore(false)
    nextOffsetRef.current = 0
    loadPage(0, false)
  }, [loadPage, disabled])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || loading || loadingMore || disabled) return

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
  }, [hasMore, loading, loadingMore, loadPage, disabled])

  if (disabled) {
    return (
      <div className="border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 leading-relaxed">
        Customer voice is locked in the free preview. Unlock to read every negative review — proof that
        AI didn&apos;t invent the pain points.
      </div>
    )
  }

  const shown = reviews.length

  return (
    <div>
      <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
        Real customer complaints from G2 and Capterra. Filter, search, scroll — nothing generated.
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

      {clusterTitle && (
        <p className="text-xs font-mono text-zinc-500 mb-4">
          Filtered by pain: <span className="text-zinc-800">{clusterTitle}</span>
        </p>
      )}

      <p className="text-xs font-mono text-zinc-400 mb-4">
        {loading && shown === 0
          ? 'Loading…'
          : total > 0
            ? `${shown} of ${total} reviews`
            : 'No reviews'}
      </p>

      <div className="border border-zinc-200 bg-white divide-y divide-zinc-200">
        {reviews.map((review) => (
          <QuoteCard
            key={review.id}
            quote={{
              text: review.text,
              rating: review.rating,
              competitor: review.product,
              source: review.source,
              category: clusterTitle,
            }}
          />
        ))}

        {loading && shown === 0 && (
          <>
            <ReviewSkeleton />
            <ReviewSkeleton />
          </>
        )}

        {loadingMore && <ReviewSkeleton />}

        {!loading && shown === 0 && (
          <p className="text-sm text-zinc-500 text-center py-12">No reviews match your filters.</p>
        )}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />

      {!loading && !hasMore && shown > 0 && (
        <p className="text-xs text-zinc-400 text-center mt-6 font-mono">All reviews loaded</p>
      )}
    </div>
  )
}
