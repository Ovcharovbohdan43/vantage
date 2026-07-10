import Link from 'next/link'
import type { ReactNode } from 'react'
import { SoftPageGradient } from '@/components/soft-page-gradient'
import { VantageLogo } from '@/components/vantage-logo'

interface AuthPageShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthPageShell({ title, subtitle, children, footer }: AuthPageShellProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16">
      <SoftPageGradient />

      <div className="w-full max-w-sm border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 bg-gradient-to-b from-zinc-50/80 to-white border-b border-zinc-100">
          <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight hover:text-zinc-600 transition-colors">
            <VantageLogo size={20} />
            Vantage
          </Link>
          <h1 className="text-xl font-semibold text-zinc-950 mt-6 mb-1">{title}</h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>

        <div className="px-6 py-6">
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}
