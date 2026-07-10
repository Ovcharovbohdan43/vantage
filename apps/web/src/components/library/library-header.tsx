import Link from 'next/link'
import { VantageLogo } from '@/components/vantage-logo'

export function LibraryHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/library" className="flex items-center gap-2">
          <VantageLogo size={20} />
          <span className="text-sm font-semibold text-zinc-950 tracking-tight">Vantage</span>
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Research Library</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/library" className="text-zinc-600 hover:text-zinc-950 transition-colors">
            Browse
          </Link>
          <Link
            href="/signup"
            className="text-zinc-950 font-medium border border-zinc-950 px-3 py-1.5 hover:bg-zinc-950 hover:text-white transition-colors"
          >
            Validate your idea
          </Link>
        </nav>
      </div>
    </header>
  )
}
