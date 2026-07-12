import Link from 'next/link'
import { VantageLogo } from '@/components/vantage-logo'

export function LandingHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/5 bg-[#131315]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <VantageLogo size={20} className="shrink-0" />
          <span className="truncate text-[15px] font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/library"
            className="text-sm text-[#cbc3d7] transition-colors hover:text-[#d0bcff]"
          >
            Research Library
          </Link>
          <a href="#pricing" className="text-sm text-[#cbc3d7] transition-colors hover:text-[#d0bcff]">
            Pricing
          </a>
          <Link href="/login" className="text-sm text-[#cbc3d7] transition-colors hover:text-[#d0bcff]">
            Sign in
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-2 py-1.5 text-xs text-[#cbc3d7] transition-colors hover:text-[#d0bcff] md:hidden"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="landing-primary-glow whitespace-nowrap rounded-lg bg-[#d0bcff] px-3 py-2 text-xs font-semibold text-[#3c0091] transition-transform active:scale-95 sm:px-4 sm:text-sm sm:py-2.5"
          >
            <span className="sm:hidden">Start free</span>
            <span className="hidden sm:inline">Start free preview</span>
          </Link>
        </div>
      </nav>
    </header>
  )
}
