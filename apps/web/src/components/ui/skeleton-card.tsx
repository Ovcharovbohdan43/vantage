import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('border border-zinc-200 p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
