import { Skeleton } from '@/components/ui/skeleton'

export function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 animate-pulse">
      <Skeleton className="h-4 w-32 mb-6" />
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-2/3 mb-3" />
      <Skeleton className="h-4 w-full max-w-2xl mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      <Skeleton className="h-40 mb-6" />
      <Skeleton className="h-16 mb-8" />
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-24 mb-10" />

      <Skeleton className="h-4 w-40 mb-4" />
      <div className="space-y-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}
