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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>
        <Skeleton className="h-9 w-32 bg-white/10" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl bg-white/10" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 bg-white/10" />
        <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
        <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  )
}
