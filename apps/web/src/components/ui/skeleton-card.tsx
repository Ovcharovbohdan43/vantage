'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { PolygonSpinner } from '@/components/ui/polygon-spinner'

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3 border border-zinc-200 p-4', className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-5xl flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6 md:px-8">
      <PolygonSpinner size={72} className="text-v-primary" label="Loading dashboard" />
      <p className="relative z-10 font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
        Loading workspace
      </p>
    </div>
  )
}
