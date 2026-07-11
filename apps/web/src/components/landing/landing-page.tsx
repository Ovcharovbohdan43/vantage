import Link from 'next/link'
import type { LibraryArticleSummary } from '@/lib/api/library'
import type { ResearchPackInfo } from '@/lib/api/types'
import { EnergyAnimation } from '@/components/energy-animation'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingReveal } from '@/components/landing/landing-reveal'
import { TypewriterText } from '@/components/landing/typewriter-text'
import { VantageLogo } from '@/components/vantage-logo'

const STEPS = [
  {
    step: '01',
    title: 'Describe your idea',
    body: 'Tell us the problem you want to solve and who it is for. Your first run is a free market teaser.',
    tag: 'Scenario ready',
    tagTone: 'primary' as const,
  },
  {
    step: '02',
    title: 'We read real complaints',
    body: 'Vantage maps competitors and collects negative reviews from G2 and Capterra — not marketing pages.',
    tag: 'Real reviews',
    tagTone: 'secondary' as const,
  },
  {
    step: '03',
    title: 'Get a verdict you can trust',
    body: "Pain clusters with quotes, market saturation, risks, and a build / pivot / don't-build recommendation.",
    tag: 'Verdict ready',
    tagTone: 'tertiary' as const,
  },
]

const DEPTH_ROWS = [
  {
    depth: 'Shallow',
    credits: '1 credit',
    scope: '5 products · 50 reviews each',
    tone: 'secondary' as const,
  },
  {
    depth: 'Standard',
    credits: '2 credits',
    scope: '10 products · 100 reviews each',
    tone: 'primary' as const,
  },
  {
    depth: 'Deep',
    credits: '3 credits',
    scope: '15 products · 200 reviews each',
    tone: 'tertiary' as const,
  },
]

const TAG_COLOR = {
  primary: 'text-[#d0bcff]',
  secondary: 'text-[#4cd7f6]',
  tertiary: 'text-[#4edea3]',
}

const CARD_HOVER = {
  primary:
    'hover:border-[#d0bcff]/45 hover:shadow-[0_8px_32px_rgba(208,188,255,0.14)] focus-visible:border-[#d0bcff]/45 focus-visible:shadow-[0_8px_32px_rgba(208,188,255,0.14)]',
  secondary:
    'hover:border-[#4cd7f6]/45 hover:shadow-[0_8px_32px_rgba(76,215,246,0.14)] focus-visible:border-[#4cd7f6]/45 focus-visible:shadow-[0_8px_32px_rgba(76,215,246,0.14)]',
  tertiary:
    'hover:border-[#4edea3]/45 hover:shadow-[0_8px_32px_rgba(78,222,163,0.14)] focus-visible:border-[#4edea3]/45 focus-visible:shadow-[0_8px_32px_rgba(78,222,163,0.14)]',
}

const CARD_GLOW = {
  primary: 'from-[#d0bcff]/15',
  secondary: 'from-[#4cd7f6]/15',
  tertiary: 'from-[#4edea3]/15',
}

interface LandingPageProps {
  featuredArticles: LibraryArticleSummary[]
  packs: ResearchPackInfo[]
}

export function LandingPage({ featuredArticles, packs }: LandingPageProps) {
  return (
    <div className="landing-root min-h-screen">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-24 left-1/4 h-72 w-72 rounded-full bg-[#d0bcff]/10 blur-[100px]" />
            <div className="absolute right-10 bottom-10 h-64 w-64 rounded-full bg-[#4cd7f6]/10 blur-[90px]" />
          </div>

          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 md:px-8 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d0bcff]/20 bg-[#d0bcff]/10 px-3 py-1">
                <span className="font-[family-name:var(--font-landing-mono)] text-[11px] font-medium uppercase tracking-wider text-[#d0bcff]">
                  Market pain research
                </span>
              </div>

              <h1 className="max-w-xl text-3xl font-bold leading-[1.15] tracking-tight md:text-5xl">
                <TypewriterText
                  text={"Find out if your idea is worth the next\n3 months"}
                  energyGradient
                />
              </h1>

              <p className="max-w-lg text-base leading-relaxed text-[#cbc3d7] md:text-lg">
                Before you write code, see what customers actually complain about in your market.
                Evidence from real reviews — not a generic AI essay.
              </p>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  href="/signup"
                  className="landing-primary-glow inline-flex items-center justify-center rounded-lg bg-[#d0bcff] px-7 py-3.5 text-sm font-bold text-[#3c0091] transition-transform hover:-translate-y-0.5"
                >
                  Start free preview
                </Link>
                <Link
                  href="/library"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-7 py-3.5 text-sm font-bold text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/50"
                >
                  Browse research library
                  <span aria-hidden>→</span>
                </Link>
              </div>

              <p className="border-t border-white/10 pt-6 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#cbc3d7]">
                First analysis free · Full reports from $9
              </p>
            </div>

            <div className="relative flex min-h-[280px] items-center justify-center lg:min-h-[420px] lg:justify-end">
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute top-1/4 right-1/4 h-56 w-56 rounded-full bg-[#d0bcff]/15 blur-[90px]" />
                <div className="absolute bottom-1/4 left-1/3 h-40 w-40 rounded-full bg-[#ff5ec8]/10 blur-[80px]" />
              </div>
              <EnergyAnimation className="h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] lg:h-[420px] lg:w-[420px]" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-white/5 py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <p className="mb-3 text-center font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-[0.2em] text-[#cbc3d7]">
              The methodology
            </p>
            <h2 className="mx-auto mb-4 max-w-2xl text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Turn raw ideas into{' '}
              <span className="bg-gradient-to-r from-white to-[#d0bcff] bg-clip-text text-transparent">
                validated conviction
              </span>
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-center text-sm leading-relaxed text-[#cbc3d7] md:text-base">
              Stop guessing. Map market frustration from real reviews before you write a single line of
              code.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((item, index) => (
                <LandingReveal key={item.step} delayMs={index * 90}>
                  <div
                    tabIndex={0}
                    className={`group relative h-full overflow-hidden rounded-xl border border-white/10 bg-[#201f22] p-5 outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#262428] focus-visible:-translate-y-1 focus-visible:bg-[#262428] ${CARD_HOVER[item.tagTone]}`}
                  >
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${CARD_GLOW[item.tagTone]} via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100`}
                    />
                    <div className="relative">
                      <span className="font-[family-name:var(--font-landing-mono)] text-[11px] text-[#cbc3d7] transition-colors duration-300 group-hover:text-[#e5e1e4]">
                        {item.step}
                      </span>
                      <h3 className="mt-3 mb-2 text-base font-semibold text-[#e5e1e4] transition-colors duration-300">
                        {item.title}
                      </h3>
                      <p className="mb-6 text-sm leading-relaxed text-[#cbc3d7] transition-colors duration-300 group-hover:text-[#d8d0e4]">
                        {item.body}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-landing-mono)] text-[10px] uppercase tracking-wider ${TAG_COLOR[item.tagTone]}`}
                      >
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100 group-hover:shadow-[0_0_8px_currentColor]"
                        />
                        {item.tag}
                      </span>
                    </div>
                  </div>
                </LandingReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Preview vs full */}
        <section className="border-t border-white/5 py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="overflow-hidden rounded-2xl border border-white/10 md:grid md:grid-cols-2">
              <div className="bg-[#1c1b1d] p-6 md:p-8">
                <p className="mb-2 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#4edea3]">
                  Free preview · once
                </p>
                <h3 className="mb-4 text-lg font-semibold text-[#e5e1e4]">Market teaser</h3>
                <ul className="mb-6 space-y-2 text-sm leading-relaxed text-[#cbc3d7]">
                  <li>✓ 3 competitors, 5 reviews each</li>
                  <li>✓ Top pain themes (titles only)</li>
                  <li>✓ Market saturation signal</li>
                  <li className="text-[#958ea0]">○ No quotes or build/pivot verdict</li>
                </ul>
                <Link
                  href="/signup"
                  className="inline-flex rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-[#e5e1e4] transition-colors hover:border-[#d0bcff]/50"
                >
                  Generate teaser
                </Link>
              </div>
              <div className="bg-[#d0bcff] p-6 text-[#3c0091] md:p-8">
                <p className="mb-2 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider opacity-70">
                  Full report · credits
                </p>
                <h3 className="mb-4 text-lg font-semibold">Decision-grade analysis</h3>
                <ul className="mb-6 space-y-2 text-sm leading-relaxed">
                  <li>○ Real user quotes under every pain</li>
                  <li>○ Severity scores and opportunity map</li>
                  <li>○ Risk analysis and market score</li>
                  <li>○ Build / pivot / don&apos;t-build recommendation</li>
                </ul>
                <Link
                  href="/signup"
                  className="inline-flex rounded-lg bg-[#3c0091] px-4 py-2.5 text-sm font-semibold text-[#d0bcff] transition-opacity hover:opacity-90"
                >
                  Get full report
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Research depth */}
        <section className="border-t border-white/5 py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <p className="mb-2 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#cbc3d7]">
              Research depth
            </p>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">Pay for the depth you need</h2>
            <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[#cbc3d7]">
              After your free preview, choose how many reviews to analyze. Deeper runs cost more credits
              but surface stronger patterns.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {DEPTH_ROWS.map((row, index) => (
                <LandingReveal key={row.depth} delayMs={index * 100}>
                  <div
                    tabIndex={0}
                    className={`group relative flex h-full min-h-[120px] flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-t from-[#2a2a2c] to-[#201f22] p-4 outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:from-[#303033] hover:to-[#262428] focus-visible:-translate-y-1 focus-visible:from-[#303033] focus-visible:to-[#262428] ${CARD_HOVER[row.tone]}`}
                  >
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${CARD_GLOW[row.tone]} via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100`}
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#e5e1e4] transition-colors duration-300">
                        {row.depth}
                      </span>
                      <span
                        className={`font-[family-name:var(--font-landing-mono)] text-[11px] transition-all duration-300 group-hover:brightness-125 ${TAG_COLOR[row.tone]}`}
                      >
                        {row.credits}
                      </span>
                    </div>
                    <p className="relative font-[family-name:var(--font-landing-mono)] text-[11px] text-[#cbc3d7] transition-colors duration-300 group-hover:text-[#d8d0e4]">
                      {row.scope}
                    </p>
                  </div>
                </LandingReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Library teaser */}
        {featuredArticles.length > 0 && (
          <section className="border-t border-white/5 py-16 md:py-20">
            <div className="mx-auto max-w-[1200px] px-5 md:px-8">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-2 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#d0bcff]">
                    Evidence-based insights
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Public market research you can verify
                  </h2>
                </div>
                <Link
                  href="/library"
                  className="text-sm font-medium text-[#d0bcff] underline-offset-2 hover:underline"
                >
                  View all research →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/library/${article.slug}`}
                    className="group flex min-h-[160px] flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-t from-[#2a2a2c]/80 to-[#201f22] p-5 transition-colors hover:border-[#d0bcff]/40"
                  >
                    <div>
                      <span className="font-[family-name:var(--font-landing-mono)] text-[10px] uppercase tracking-wider text-[#d0bcff]">
                        {article.category}
                      </span>
                      <h3 className="mt-2 text-base font-semibold leading-snug text-[#e5e1e4] group-hover:underline">
                        {article.title}
                      </h3>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-2 font-[family-name:var(--font-landing-mono)] text-[10px] uppercase tracking-wide text-[#cbc3d7]">
                      <div>
                        <div className="text-[#958ea0]">Products</div>
                        <div className="mt-0.5 text-[#e5e1e4]">{article.products_count}</div>
                      </div>
                      <div>
                        <div className="text-[#958ea0]">Reviews</div>
                        <div className="mt-0.5 text-[#e5e1e4]">{article.reviews_count}</div>
                      </div>
                      <div>
                        <div className="text-[#958ea0]">Saturation</div>
                        <div className="mt-0.5 text-[#e5e1e4]">{article.market_saturation}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        <section id="pricing" className="border-t border-white/5 py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <p className="mb-3 text-center font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#d0bcff]">
              Simple credit system
            </p>
            <h2 className="mb-3 text-center text-2xl font-semibold tracking-tight md:text-3xl">
              One-time packs,{' '}
              <span className="text-[#d0bcff]">no subscription</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-center text-sm leading-relaxed text-[#cbc3d7]">
              1 credit = one full analysis at shallow depth. Use credits when you&apos;re ready — they
              don&apos;t expire.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {packs.map((pack, index) => {
                const popular = pack.id === 'founder'
                const tone =
                  pack.id === 'founder' ? 'primary' : pack.id === 'indie' ? 'tertiary' : 'secondary'

                return (
                  <LandingReveal key={pack.id} delayMs={index * 110}>
                    <div
                      className={`group relative h-full overflow-hidden rounded-xl border p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 ${
                        popular
                          ? 'border-[#d0bcff]/70 bg-[#201f22] shadow-[0_0_36px_rgba(208,188,255,0.12)] hover:border-[#d0bcff] hover:shadow-[0_12px_40px_rgba(208,188,255,0.22)]'
                          : `border-white/10 bg-[#1c1b1d] hover:bg-[#222124] ${CARD_HOVER[tone]}`
                      }`}
                    >
                      <div
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${CARD_GLOW[tone]} via-transparent to-transparent transition-opacity duration-300 ${
                          popular
                            ? 'opacity-40 group-hover:opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      />
                      <div className="relative">
                        <h3 className="text-sm font-semibold text-[#e5e1e4]">{pack.label}</h3>
                        <p className="mt-2 text-3xl font-semibold tabular-nums text-[#e5e1e4] transition-colors duration-300 group-hover:text-white">
                          ${pack.price_usd}
                          <span className="ml-1 text-sm font-normal text-[#cbc3d7]">one-time</span>
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#cbc3d7] transition-colors duration-300 group-hover:text-[#d8d0e4]">
                          {pack.tagline}
                        </p>
                        <p
                          className={`mt-4 font-[family-name:var(--font-landing-mono)] text-[11px] transition-all duration-300 group-hover:brightness-125 ${TAG_COLOR[tone]}`}
                        >
                          {pack.credits} full {pack.credits === 1 ? 'analysis' : 'analyses'}
                        </p>
                        <Link
                          href="/signup"
                          className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                            popular
                              ? 'landing-primary-glow bg-[#d0bcff] text-[#3c0091] hover:opacity-90 group-hover:-translate-y-0.5'
                              : 'border border-white/15 text-[#e5e1e4] hover:border-[#d0bcff]/50 group-hover:border-[#d0bcff]/40'
                          }`}
                        >
                          {popular ? `Buy ${pack.label}` : `Select ${pack.label}`}
                        </Link>
                      </div>
                    </div>
                  </LandingReveal>
                )
              })}
            </div>

            <div className="mt-12 rounded-2xl border border-white/10 bg-[#201f22] px-6 py-10 text-center">
              <h3 className="mb-2 text-xl font-semibold">Ready to see what the market knows?</h3>
              <p className="mb-6 text-sm text-[#cbc3d7]">
                No recurring fees. Start with a free preview, unlock when the signal is clear.
              </p>
              <Link
                href="/signup"
                className="landing-primary-glow inline-flex rounded-lg bg-[#d0bcff] px-6 py-3 text-sm font-bold text-[#3c0091]"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#0e0e10]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-12 md:grid-cols-4 md:px-8">
          <div className="md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <VantageLogo size={18} />
              <span className="font-semibold text-[#e5e1e4]">Vantage</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#cbc3d7]">
              Industrial-grade intelligence for the modern technical founder.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#d0bcff]">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-[#cbc3d7]">
              <li>
                <Link href="/library" className="hover:text-[#d0bcff]">
                  Research Library
                </Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#d0bcff]">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#d0bcff]">
              Account
            </h4>
            <ul className="space-y-2 text-sm text-[#cbc3d7]">
              <li>
                <Link href="/login" className="hover:text-[#d0bcff]">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#d0bcff]">
                  Start free preview
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-landing-mono)] text-[11px] uppercase tracking-wider text-[#d0bcff]">
              Status
            </h4>
            <p className="flex items-center gap-2 text-sm text-[#4edea3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]" />
              System operational
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 px-5 py-4 text-center text-xs text-[#958ea0] md:px-8">
          © {new Date().getFullYear()} Vantage — market pain research
        </div>
      </footer>
    </div>
  )
}
