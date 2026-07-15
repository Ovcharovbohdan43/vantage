'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { List, MagnifyingGlass, X } from '@phosphor-icons/react'
import { VantageLogo } from '@/components/vantage-logo'
import { CreditsMeter } from '@/components/credits-meter'
import { PendingPromoRedeemer } from '@/components/pending-promo-redeemer'
import { getCredits } from '@/lib/api/billing'
import type { CreditsBalance } from '@/lib/api/types'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  userEmail: string
}

export const APP_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/research/new', label: 'New research' },
  { href: '/idea-of-the-week', label: 'Idea of the Week' },
  { href: '/library', label: 'Research Library' },
  { href: '/support', label: 'Support' },
] as const

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="App">
      {APP_NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'mb-0.5 flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors',
              active
                ? 'bg-white/[0.06] font-medium text-v-on'
                : 'text-v-muted hover:bg-white/[0.04] hover:text-v-on',
            )}
          >
            {active && (
              <span className="mr-2 h-4 w-0.5 shrink-0 rounded-full bg-v-primary" aria-hidden />
            )}
            {!active && <span className="mr-2 w-0.5 shrink-0" aria-hidden />}
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
  pathname,
  onSignOut,
  onNavigate,
}: {
  userEmail: string
  credits?: CreditsBalance
  pathname: string
  onSignOut: () => void
  onNavigate?: () => void
}) {
  const accountActive = pathname === '/account' || pathname.startsWith('/account/')

  return (
    <div className="border-t border-white/[0.06] px-2 py-2">
      <Link
        href="/account"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors',
          accountActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
        )}
        aria-current={accountActive ? 'page' : undefined}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-v-primary/15">
          <span className="text-[10px] font-medium text-v-primary">{getInitials(userEmail)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate text-xs font-medium',
              accountActive ? 'text-v-on' : 'text-v-on/90',
            )}
          >
            {userEmail}
          </div>
          {credits ? (
            <CreditsMeter credits={credits} compact />
          ) : (
            <div className="truncate text-[10px] text-v-muted">Free preview</div>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-[13px] text-v-muted transition-colors hover:bg-white/[0.04] hover:text-v-on"
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
    staleTime: 0,
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
    <div className="landing-root flex h-dvh overflow-hidden bg-v-bg font-sans text-v-on">
      <PendingPromoRedeemer />

      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/[0.06] bg-v-surface md:flex">
        <Link
          href="/dashboard"
          className="flex h-14 items-center gap-2 border-b border-white/[0.06] px-4 transition-opacity hover:opacity-80"
        >
          <VantageLogo size={18} />
          <span className="text-[15px] font-semibold tracking-tight text-v-on">Vantage</span>
        </Link>
        <NavLinks pathname={pathname} />
        <UserFooter
          userEmail={userEmail}
          credits={credits}
          pathname={pathname}
          onSignOut={handleSignOut}
        />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-white/[0.08] bg-v-surface">
            <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <VantageLogo size={18} />
                <span className="text-[15px] font-semibold tracking-tight text-v-on">Vantage</span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="-mr-2 p-2 text-v-muted hover:text-v-on"
                aria-label="Close menu"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <UserFooter
              userEmail={userEmail}
              credits={credits}
              pathname={pathname}
              onSignOut={handleSignOut}
              onNavigate={() => setMenuOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-v-bg/90 px-3 backdrop-blur-md sm:px-4 md:px-6">
          <button
            type="button"
            className="-ml-1 p-2 text-v-muted hover:text-v-on md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <List size={20} weight="bold" />
          </button>

          <Link href="/dashboard" className="mr-1 flex shrink-0 items-center gap-1.5 md:hidden">
            <VantageLogo size={18} />
            <span className="text-sm font-semibold tracking-tight text-v-on">Vantage</span>
          </Link>

          <form onSubmit={handleHeaderSearch} className="relative hidden min-w-0 flex-1 sm:block">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-v-muted">
              <MagnifyingGlass size={14} weight="bold" aria-hidden />
            </span>
            <input
              type="search"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              placeholder="Search library…"
              className="w-full max-w-xs rounded-md border border-white/10 bg-v-surface py-1.5 pr-3 pl-8 text-sm text-v-on outline-none transition-colors placeholder:text-v-muted focus:border-v-primary/40 focus:ring-1 focus:ring-v-primary/20 md:max-w-sm"
              aria-label="Search research library"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className={cn(
                'p-2 text-v-muted hover:text-v-on sm:hidden',
                searchOpen && 'text-v-primary',
              )}
              aria-label="Search library"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <MagnifyingGlass size={18} weight="bold" />
            </button>
            <Link
              href="/research/new"
              className="inline-flex h-8 items-center justify-center rounded-md bg-v-on px-2.5 text-[13px] font-medium text-v-bg transition-opacity hover:opacity-90 sm:px-3"
            >
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">New research</span>
            </Link>
          </div>
        </header>

        {searchOpen && (
          <div className="border-b border-white/[0.06] px-3 py-2 sm:hidden">
            <form onSubmit={handleHeaderSearch} className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-v-muted">
                <MagnifyingGlass size={16} weight="bold" aria-hidden />
              </span>
              <input
                type="search"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder="Search library…"
                autoFocus
                className="w-full rounded-md border border-white/10 bg-v-surface py-2.5 pr-3 pl-9 text-sm text-v-on outline-none placeholder:text-v-muted focus:border-v-primary/40 focus:ring-1 focus:ring-v-primary/20"
                aria-label="Search research library"
              />
            </form>
          </div>
        )}

        <main className="relative flex-1 overflow-y-auto bg-v-bg">
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  )
}
