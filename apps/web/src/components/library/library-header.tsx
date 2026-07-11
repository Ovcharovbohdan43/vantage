import Link from 'next/link'
import { VantageLogo } from '@/components/vantage-logo'

export function LibraryHeader() {
  return (
    <header className="border-b border-white/8 bg-[#0e0e10]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/library" className="flex items-center gap-2">
          <VantageLogo size={20} />
          <span className="text-sm font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
          <span className="font-mono text-xs uppercase tracking-widest text-[#958ea0]">
            Research Library
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/library" className="text-[#cbc3d7] transition-colors hover:text-[#d0bcff]">
            Browse
          </Link>
          <Link
            href="/signup"
            className="landing-primary-glow rounded-lg bg-[#d0bcff] px-3 py-1.5 text-sm font-semibold text-[#3c0091]"
          >
            Validate your idea
          </Link>
        </nav>
      </div>
    </header>
  )
}
