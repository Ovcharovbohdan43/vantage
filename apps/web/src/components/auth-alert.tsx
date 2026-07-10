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
        'flex gap-3 border p-4 text-sm',
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-red-200 bg-red-50 text-red-900',
        className,
      )}
    >
      <Icon
        className={cn('size-5 shrink-0 mt-0.5', isSuccess ? 'text-emerald-600' : 'text-red-600')}
        aria-hidden
      />
      <div>
        <p className="font-medium leading-snug">{title}</p>
        {description && <p className={cn('mt-1 leading-relaxed', isSuccess ? 'text-emerald-800' : 'text-red-800')}>{description}</p>}
      </div>
    </div>
  )
}
