import Link from 'next/link'
import { VantageLogo } from '@/components/vantage-logo'

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#131315]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <VantageLogo size={20} />
          <span className="text-[15px] font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
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

        <Link
          href="/signup"
          className="landing-primary-glow rounded-lg bg-[#d0bcff] px-4 py-2 text-sm font-semibold text-[#3c0091] transition-transform active:scale-95 sm:px-5 sm:py-2.5"
        >
          Start free preview
        </Link>
      </nav>
    </header>
  )
}
