import { Providers } from '@/components/providers'
import './globals.css'

export const metadata = {
  title: 'Vantage — Find out if your idea is worth building',
  description:
    'Validate startup ideas with real negative reviews from G2 and Capterra. Market pain research with evidence, not generic AI reports.',
  openGraph: {
    title: 'Vantage — Market pain research',
    description: 'Find out if your idea is worth the next 3 months — before you write code.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-white text-zinc-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
