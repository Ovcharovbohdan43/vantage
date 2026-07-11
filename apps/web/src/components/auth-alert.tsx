import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'

interface AuthAlertProps {
  variant: 'success' | 'error'
  title: string
  description?: string
  className?: string
}

export function AuthAlert({ variant, title, description, className }: AuthAlertProps) {
  const isSuccess = variant === 'success'
  const Icon = isSuccess ? CheckCircle2 : XCircle

  return (
    <div
      role="status"
      className={cn(
        'flex gap-3 rounded-lg border p-4 text-sm',
        isSuccess
          ? 'border-[#4edea3]/30 bg-[#4edea3]/10 text-[#4edea3]'
          : 'border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]',
        className,
      )}
    >
      <Icon
        className={cn('mt-0.5 size-5 shrink-0', isSuccess ? 'text-[#4edea3]' : 'text-[#ffb4ab]')}
        aria-hidden
      />
      <div>
        <p className="font-medium leading-snug text-[#e5e1e4]">{title}</p>
        {description && (
          <p className={cn('mt-1 leading-relaxed', isSuccess ? 'text-[#4edea3]/80' : 'text-[#ffb4ab]/80')}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
