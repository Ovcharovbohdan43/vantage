import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create account',
  description:
    'Create a Vantage account to validate startup ideas with real G2 and Capterra pain research.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
