import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-none bg-zinc-100', className)}
      {...props}
    />
  )
}

export { Skeleton }
