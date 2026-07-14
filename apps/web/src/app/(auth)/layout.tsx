import type { Metadata } from 'next'

/** Auth screens: useful for UX, but thin pages — keep out of the index. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
