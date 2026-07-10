'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { List, MagnifyingGlass, X } from '@phosphor-icons/react'
import { VantageLogo } from '@/components/vantage-logo'
import { Button } from '@/components/ui/button'
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
    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'block w-full text-left text-sm px-3 py-2.5 mb-0.5 transition-colors',
            pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              ? 'bg-zinc-100 text-zinc-950 font-medium'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50',
          )}
        >
          {item.label}
        </Link>
      ))}
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
    <div className="border-t border-zinc-200 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-medium text-zinc-600">{getInitials(userEmail)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-zinc-900 truncate">{userEmail}</div>
          {credits ? (
            <CreditsMeter credits={credits} compact />
          ) : (
            <div className="text-[10px] text-zinc-400 truncate">Free preview</div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 justify-start px-0 text-zinc-500"
        onClick={onSignOut}
      >
        Sign out
      </Button>
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
    <div className="flex h-dvh bg-white font-sans text-zinc-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 border-r border-zinc-200 flex-col shrink-0">
        <div className="h-14 border-b border-zinc-200 flex items-center px-4 gap-2">
          <VantageLogo size={18} />
          <span className="text-[15px] font-semibold tracking-tight">Vantage</span>
        </div>
        <NavLinks pathname={pathname} />
        <UserFooter userEmail={userEmail} credits={credits} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] bg-white border-r border-zinc-200 flex flex-col shadow-xl">
            <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <VantageLogo size={18} />
                <span className="text-[15px] font-semibold tracking-tight">Vantage</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 -mr-2 text-zinc-500 hover:text-zinc-950"
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

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-zinc-200 flex items-center gap-2 px-3 sm:px-4 md:px-6 shrink-0">
          <button
            type="button"
            className="md:hidden p-2 -ml-1 text-zinc-700 hover:text-zinc-950"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <List size={20} weight="bold" />
          </button>

          <Link href="/dashboard" className="md:hidden flex items-center gap-1.5 shrink-0 mr-1">
            <VantageLogo size={18} />
            <span className="text-sm font-semibold tracking-tight">Vantage</span>
          </Link>

          <form onSubmit={handleHeaderSearch} className="hidden sm:flex flex-1 min-w-0">
            <input
              type="search"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              placeholder="Search library…"
              className="w-full max-w-xs md:max-w-sm text-sm bg-white border border-zinc-200 px-3 py-1.5 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
              aria-label="Search research library"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              className={cn(
                'sm:hidden p-2 text-zinc-600 hover:text-zinc-950',
                searchOpen && 'text-zinc-950',
              )}
              aria-label="Search library"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <MagnifyingGlass size={18} weight="bold" />
            </button>
            <Link
              href="/research/new"
              className="inline-flex items-center justify-center h-8 px-2.5 sm:px-3 text-sm font-medium bg-zinc-950 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">New analysis</span>
            </Link>
          </div>
        </header>

        {searchOpen && (
          <div className="sm:hidden border-b border-zinc-200 px-3 py-2">
            <form onSubmit={handleHeaderSearch}>
              <input
                type="search"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder="Search library…"
                autoFocus
                className="w-full text-sm bg-white border border-zinc-200 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                aria-label="Search research library"
              />
            </form>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  )
}
