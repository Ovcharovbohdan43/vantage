import Image from 'next/image'
import { cn } from '@/lib/utils'

interface VantageLogoProps {
  size?: number
  className?: string
}

export function VantageLogo({ size = 20, className }: VantageLogoProps) {
  return (
    <Image
      src="/brand/logo-mark.webp"
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden
    />
  )
}
