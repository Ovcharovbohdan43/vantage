'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { StateFigure, type StateFigureKind } from '@/components/state-screen/state-figures'
import { cn } from '@/lib/utils'

const primaryBtn =
  'inline-flex h-9 items-center justify-center rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90'
const secondaryBtn =
  'inline-flex h-9 items-center justify-center rounded-md border border-white/14 px-4 text-sm font-medium text-v-muted transition-colors hover:border-white/25 hover:text-v-on'

export interface StateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface StateScreenProps {
  figure: StateFigureKind
  title: string
  description: string
  primaryAction?: StateAction
  secondaryAction?: StateAction
  className?: string
  children?: ReactNode
}

function ActionButton({ action, variant }: { action: StateAction; variant: 'primary' | 'secondary' }) {
  const className = variant === 'primary' ? primaryBtn : secondaryBtn
  if (action.href) {
    return (
      <Link href={action.href} className={className} onClick={action.onClick}>
        {action.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  )
}

/** Human-facing empty / error state with figure illustration — no technical jargon. */
export function StateScreen({
  figure,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  children,
}: StateScreenProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14',
        className,
      )}
    >
      <div className="mb-6 w-full animate-[state-figure-in_0.45s_ease-out]">
        <StateFigure kind={figure} />
      </div>
      <h2 className="mb-2 max-w-md text-base font-semibold tracking-tight text-v-on sm:text-lg">
        {title}
      </h2>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-v-muted">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
        </div>
      )}
      {children}
    </div>
  )
}
