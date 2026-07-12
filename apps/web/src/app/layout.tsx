import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
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

const CLARITY_PROJECT_ID = 'xldittplv4'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="microsoft-clarity" strategy="beforeInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
        </Script>
      </head>
      <body className="font-sans antialiased bg-white text-zinc-950">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
