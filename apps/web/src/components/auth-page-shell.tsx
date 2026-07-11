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
    <div className="landing-root relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-16 left-1/4 h-72 w-72 rounded-full bg-[#d0bcff]/15 blur-[110px]" />
        <div className="absolute right-10 bottom-20 h-64 w-64 rounded-full bg-[#ff4ec8]/12 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4cd7f6]/8 blur-[90px]" />
      </div>

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#1c1b1d]/90 shadow-[0_0_48px_rgba(208,188,255,0.08)] backdrop-blur-md">
        <div className="border-b border-white/8 bg-gradient-to-b from-[#2a2a2c]/80 to-transparent px-6 pt-8 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[#e5e1e4] transition-colors hover:text-[#d0bcff]"
          >
            <VantageLogo size={20} />
            Vantage
          </Link>
          <h1 className="mt-6 mb-1 text-xl font-semibold tracking-tight text-[#e5e1e4]">{title}</h1>
          <p className="text-sm leading-relaxed text-[#cbc3d7]">{subtitle}</p>
        </div>

        <div className="px-6 py-6">
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}
