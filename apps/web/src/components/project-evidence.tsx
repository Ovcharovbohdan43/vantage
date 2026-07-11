'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getProjectReviews, type ProjectReview } from '@/lib/api/reviews'
import { QuoteCard } from '@/components/report/report-competitors'
import type { ReportPainCluster } from '@/lib/api/types'

const PAGE_SIZE = 20

const fieldClass =
  'rounded-lg border border-white/12 bg-[#1c1b1d] px-3 py-2 text-sm text-[#e5e1e4] outline-none transition-colors focus:border-[#d0bcff]/45 placeholder:text-[#958ea0]'

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
    <div className="space-y-2 border-b border-white/8 p-5 last:border-0">
      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-full animate-pulse rounded bg-white/10" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
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
      <div className="rounded-xl border border-[#d0bcff]/25 bg-[#d0bcff]/8 p-6 text-sm leading-relaxed text-[#cbc3d7]">
        Customer voice is locked in the free preview. Unlock to read every negative review — proof that
        AI didn&apos;t invent the pain points.
      </div>
    )
  }

  const shown = reviews.length

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-[#958ea0]">
        Real customer complaints from G2 and Capterra. Filter, search, scroll — nothing generated.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className={fieldClass}
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
          className={`min-w-[180px] flex-1 ${fieldClass}`}
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

      {clusterTitle && (
        <p className="mb-4 font-mono text-xs text-[#958ea0]">
          Filtered by pain: <span className="text-[#e5e1e4]">{clusterTitle}</span>
        </p>
      )}

      <p className="mb-4 font-mono text-xs text-[#958ea0]">
        {loading && shown === 0
          ? 'Loading…'
          : total > 0
            ? `${shown} of ${total} reviews`
            : 'No reviews'}
      </p>

      <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10 bg-[#1c1b1d]/60">
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
          <p className="py-12 text-center text-sm text-[#958ea0]">No reviews match your filters.</p>
        )}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />

      {!loading && !hasMore && shown > 0 && (
        <p className="mt-6 text-center font-mono text-xs text-[#958ea0]">All reviews loaded</p>
      )}
    </div>
  )
}
