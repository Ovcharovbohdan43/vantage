import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AuthAlertProps {
  variant: 'success' | 'error'
  title: string
  description?: string
  className?: string
}

export function AuthAlert({ variant, title, description, className }: AuthAlertProps) {
  const isSuccess = variant === 'success'
  const Icon = isSuccess ? CheckCircle : XCircle

  return (
    <div
      role="status"
      className={cn(
        'flex gap-3 rounded-lg border p-4 text-sm',
        isSuccess
          ? 'border-v-tertiary/30 bg-v-tertiary/10 text-v-tertiary'
          : 'border-v-error/30 bg-v-error/10 text-v-error',
        className,
      )}
    >
      <Icon
        weight="fill"
        className={cn('mt-0.5 size-5 shrink-0', isSuccess ? 'text-v-tertiary' : 'text-v-error')}
        aria-hidden
      />
      <div>
        <p className="font-medium leading-snug text-v-on">{title}</p>
        {description && (
          <p
            className={cn(
              'mt-1 leading-relaxed',
              isSuccess ? 'text-v-tertiary/85' : 'text-v-error/85',
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
