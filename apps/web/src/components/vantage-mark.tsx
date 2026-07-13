import { cn } from '@/lib/utils'

interface VantageMarkProps {
  size?: number
  className?: string
  /** Fill color — defaults to currentColor for light/dark contexts */
  color?: string
  title?: string
}

/**
 * Vantage mark — elevated viewpoint: bold geometric V + horizon line.
 * Linear-style craft (flat, optical, reads at 16px), unique geometry.
 */
export function VantageMark({
  size = 20,
  className,
  color = 'currentColor',
  title,
}: VantageMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* Bold V — flat tops, sharp nadir */}
      <path
        fill={color}
        d="M3.2 3.75h4.05L12 15.35 16.75 3.75H20.8L13.55 20.5h-3.1L3.2 3.75Z"
      />
      {/* Horizon / vantage line — crosses both legs */}
      <rect x="1.75" y="9.85" width="20.5" height="1.55" rx="0.35" fill={color} />
    </svg>
  )
}
