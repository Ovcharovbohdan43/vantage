'use client'

import Link from 'next/link'
import { useState } from 'react'
import { List, X } from '@phosphor-icons/react'
import { VantageLogo } from '@/components/vantage-logo'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/library', label: 'Library' },
  { href: '#method', label: 'Method' },
  { href: '#report', label: 'Report' },
  { href: '#pricing', label: 'Pricing' },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/[0.06] bg-v-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-5 md:h-[60px] md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <VantageLogo size={20} className="shrink-0" />
          <span className="text-[15px] font-semibold tracking-tight text-v-on">Vantage</span>
        </Link>

        <div className="ml-auto hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) =>
            link.href.startsWith('#') ? (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] text-v-muted transition-colors hover:text-v-on"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-v-muted transition-colors hover:text-v-on"
              >
                {link.label}
              </Link>
            ),
          )}
          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
          <Link
            href="/login"
            className="text-[13px] text-v-muted transition-colors hover:text-v-on"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-8 items-center rounded-full bg-v-on px-3.5 text-[13px] font-medium text-v-bg transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Link
            href="/signup"
            className="inline-flex h-8 items-center rounded-full bg-v-on px-3.5 text-[13px] font-medium text-v-bg"
          >
            Sign up
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-v-muted transition-colors hover:bg-white/5 hover:text-v-on"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </nav>

      <div className={cn('border-t border-white/[0.06] bg-v-bg md:hidden', open ? 'block' : 'hidden')}>
        <div className="flex flex-col gap-1 px-5 py-3">
          {NAV_LINKS.map((link) =>
            link.href.startsWith('#') ? (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-v-muted hover:bg-white/5 hover:text-v-on"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-v-muted hover:bg-white/5 hover:text-v-on"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ),
          )}
          <Link
            href="/login"
            className="rounded-lg px-3 py-2.5 text-sm text-v-muted hover:bg-white/5 hover:text-v-on"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
        </div>
      </div>
    </header>
  )
}
