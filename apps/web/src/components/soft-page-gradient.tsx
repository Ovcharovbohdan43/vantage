import { cn } from '@/lib/utils'

interface SoftPageGradientProps {
  className?: string
}

export function SoftPageGradient({ className }: SoftPageGradientProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-b from-zinc-100/50 via-zinc-50/30 to-white',
        className,
      )}
      aria-hidden
    >
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-zinc-200/40 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-zinc-100/60 blur-3xl" />
    </div>
  )
}
