'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { List, MagnifyingGlass, X } from '@phosphor-icons/react'
import { VantageLogo } from '@/components/vantage-logo'
import { CreditsMeter } from '@/components/credits-meter'
import { getCredits } from '@/lib/api/billing'
import type { CreditsBalance } from '@/lib/api/types'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  userEmail: string
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/research/new', label: 'New research' },
  { href: '/library', label: 'Research Library' },
]

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'mb-0.5 block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
              active
                ? 'bg-[#d0bcff]/15 font-medium text-[#d0bcff]'
                : 'text-[#cbc3d7] hover:bg-white/5 hover:text-[#e5e1e4]',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({
  userEmail,
  credits,
  onSignOut,
}: {
  userEmail: string
  credits?: CreditsBalance
  onSignOut: () => void
}) {
  return (
    <div className="border-t border-white/8 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d0bcff]/20">
          <span className="text-[10px] font-medium text-[#d0bcff]">{getInitials(userEmail)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-[#e5e1e4]">{userEmail}</div>
          {credits ? (
            <CreditsMeter credits={credits} compact />
          ) : (
            <div className="truncate text-[10px] text-[#958ea0]">Free preview</div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-2 w-full justify-start px-0 text-left text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
      >
        Sign out
      </button>
    </div>
  )
}

export function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [headerQuery, setHeaderQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
  })

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function handleHeaderSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = headerQuery.trim()
    router.push(q ? `/library?q=${encodeURIComponent(q)}` : '/library')
    setSearchOpen(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="landing-root flex h-dvh overflow-hidden bg-[#131315] font-sans text-[#e5e1e4]">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/8 bg-[#0e0e10] md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-white/8 px-4">
          <VantageLogo size={18} />
          <span className="text-[15px] font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
        </div>
        <NavLinks pathname={pathname} />
        <UserFooter userEmail={userEmail} credits={credits} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-white/10 bg-[#0e0e10] shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
              <div className="flex items-center gap-2">
                <VantageLogo size={18} />
                <span className="text-[15px] font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="-mr-2 p-2 text-[#cbc3d7] hover:text-[#e5e1e4]"
                aria-label="Close menu"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <UserFooter userEmail={userEmail} credits={credits} onSignOut={handleSignOut} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/8 bg-[#131315]/90 px-3 backdrop-blur-md sm:px-4 md:px-6">
          <button
            type="button"
            className="-ml-1 p-2 text-[#cbc3d7] hover:text-[#e5e1e4] md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <List size={20} weight="bold" />
          </button>

          <Link href="/dashboard" className="mr-1 flex shrink-0 items-center gap-1.5 md:hidden">
            <VantageLogo size={18} />
            <span className="text-sm font-semibold tracking-tight text-[#e5e1e4]">Vantage</span>
          </Link>

          <form onSubmit={handleHeaderSearch} className="hidden min-w-0 flex-1 sm:flex">
            <input
              type="search"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              placeholder="Search library…"
              className="w-full max-w-xs rounded-lg border border-white/10 bg-[#1c1b1d] px-3 py-1.5 text-sm text-[#e5e1e4] placeholder-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/40 md:max-w-sm"
              aria-label="Search research library"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className={cn(
                'p-2 text-[#cbc3d7] hover:text-[#e5e1e4] sm:hidden',
                searchOpen && 'text-[#d0bcff]',
              )}
              aria-label="Search library"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <MagnifyingGlass size={18} weight="bold" />
            </button>
            <Link
              href="/research/new"
              className="landing-primary-glow inline-flex h-8 items-center justify-center rounded-lg bg-[#d0bcff] px-2.5 text-sm font-semibold text-[#3c0091] transition-transform hover:-translate-y-0.5 sm:px-3"
            >
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">New analysis</span>
            </Link>
          </div>
        </header>

        {searchOpen && (
          <div className="border-b border-white/8 px-3 py-2 sm:hidden">
            <form onSubmit={handleHeaderSearch}>
              <input
                type="search"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder="Search library…"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-[#1c1b1d] px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#958ea0] outline-none focus:border-[#d0bcff]/40"
                aria-label="Search research library"
              />
            </form>
          </div>
        )}

        <main className="relative flex-1 overflow-y-auto bg-[#131315]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#d0bcff]/8 blur-[100px]" />
            <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-[#ff4ec8]/6 blur-[90px]" />
          </div>
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  )
}
