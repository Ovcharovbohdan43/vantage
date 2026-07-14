import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site'

export const runtime = 'edge'
export const alt = `${SITE_NAME} — market pain research from real reviews`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(145deg, #050505 0%, #121212 55%, #0a1628 100%)',
          color: '#f4f4f5',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#050505',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 650,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div style={{ fontSize: 28, color: '#a1a1aa', lineHeight: 1.35, maxWidth: 820 }}>
            Real negative reviews from G2 and Capterra — pain clusters, quotes, and a clear
            verdict.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#71717a',
          }}
        >
          <span>Evidence over generic AI reports</span>
          <span>vantageserch.app</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
