import Link from 'next/link'
import { VantageLogo } from '@/components/vantage-logo'

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-v-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-[1120px] items-center justify-between gap-2 px-4 sm:h-14 sm:px-5 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <VantageLogo size={20} className="shrink-0" />
          <span className="truncate text-[15px] font-semibold tracking-tight text-v-on">Vantage</span>
          <span className="hidden font-landing-mono text-[10px] uppercase tracking-widest text-v-muted sm:inline">
            Blog
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2.5 text-sm sm:gap-4" aria-label="Blog">
          <Link href="/library" className="text-[13px] text-v-muted transition-colors hover:text-v-on">
            Library
          </Link>
          <Link href="/idea-of-the-week" className="text-[13px] text-v-muted transition-colors hover:text-v-on">
            Idea of the Week
          </Link>
          <Link href="/blog" className="text-[13px] text-v-muted transition-colors hover:text-v-on">
            Blog
          </Link>
          <Link href="/login" className="text-[13px] text-v-muted transition-colors hover:text-v-on">
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-8 items-center rounded-md bg-v-on px-2.5 text-[13px] font-medium text-v-bg transition-opacity hover:opacity-90 sm:px-3.5"
          >
            Validate your idea
          </Link>
        </nav>
      </div>
    </header>
  )
}
