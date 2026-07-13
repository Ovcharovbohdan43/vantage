import Link from 'next/link'
import type { ReactNode } from 'react'
import { VantageLogo } from '@/components/vantage-logo'

interface AuthPageShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthPageShell({ title, subtitle, children, footer }: AuthPageShellProps) {
  return (
    <div className="landing-root relative flex min-h-screen items-center justify-center px-5 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,255,71,0.07), transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/[0.08] bg-v-surface">
        <div className="border-b border-white/[0.06] px-6 pt-8 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-v-on transition-opacity hover:opacity-80"
          >
            <VantageLogo size={20} />
            Vantage
          </Link>
          <h1 className="mt-6 mb-1 text-xl font-semibold tracking-tight text-v-on">{title}</h1>
          <p className="text-sm leading-relaxed text-v-muted">{subtitle}</p>
        </div>

        <div className="px-6 py-6">
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}
