import Link from 'next/link'
import { VantageLogo } from '@/components/vantage-logo'

export function LibraryHeader() {
  return (
    <header className="border-b border-white/8 bg-[#0e0e10]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/library" className="flex min-w-0 items-center gap-2">
          <VantageLogo size={20} className="shrink-0" />
          <span className="truncate text-sm font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[#958ea0] sm:inline">
            Research Library
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2 sm:gap-4 text-sm">
          <Link
            href="/library"
            className="hidden text-[#cbc3d7] transition-colors hover:text-[#d0bcff] sm:inline"
          >
            Browse
          </Link>
          <Link
            href="/signup"
            className="landing-primary-glow whitespace-nowrap rounded-lg bg-[#d0bcff] px-2.5 py-1.5 text-xs font-semibold text-[#3c0091] sm:px-3 sm:text-sm"
          >
            <span className="sm:hidden">Validate</span>
            <span className="hidden sm:inline">Validate your idea</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
