import { VantageMark } from '@/components/vantage-mark'

interface VantageLogoProps {
  size?: number
  className?: string
}

/** In-product logo mark (inherits parent text color via currentColor). */
export function VantageLogo({ size = 20, className }: VantageLogoProps) {
  return <VantageMark size={size} className={className} />
}
