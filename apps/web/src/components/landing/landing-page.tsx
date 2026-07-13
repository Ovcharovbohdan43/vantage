import Link from 'next/link'
import type { LibraryArticleSummary } from '@/lib/api/library'
import type { ResearchPackInfo } from '@/lib/api/types'
import { FigCollect, FigDecide, FigDescribe } from '@/components/landing/landing-fig-icons'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingHeroStage } from '@/components/landing/landing-hero-stage'
import { LandingReportStage } from '@/components/landing/landing-report-stage'
import { LandingReveal } from '@/components/landing/landing-reveal'
import { VantageLogo } from '@/components/vantage-logo'

const STEPS = [
  {
    fig: 'FIG 0.1',
    title: 'Built for a decision',
    body: 'Describe the problem and audience. Get a free market teaser before you spend a credit.',
    Icon: FigDescribe,
  },
  {
    fig: 'FIG 0.2',
    title: 'Powered by real complaints',
    body: 'Competitors mapped. Negative reviews pulled from G2 and Capterra — not marketing pages.',
    Icon: FigCollect,
  },
  {
    fig: 'FIG 0.3',
    title: 'Designed for speed',
    body: 'Pain clusters with quotes, saturation, risks, and a build / pivot / don’t-build verdict.',
    Icon: FigDecide,
  },
]

const DEPTH_ROWS = [
  { depth: 'Shallow', credits: '1 credit', scope: '5 products · 50 reviews each' },
  { depth: 'Standard', credits: '2 credits', scope: '10 products · 100 reviews each' },
  { depth: 'Deep', credits: '3 credits', scope: '15 products · 200 reviews each' },
]

const RUN_STEPS = [
  {
    step: '01',
    code: 'collect',
    title: 'Map competitors and pull reviews',
    body: 'G2 and Capterra negatives only — not marketing pages or AI guesses.',
  },
  {
    step: '02',
    code: 'cluster',
    title: 'Group pains with real quotes',
    body: 'Frequency, severity, and source under every theme so the report argues with data.',
  },
  {
    step: '03',
    code: 'decide',
    title: 'Get a build / pivot / don’t-build verdict',
    body: 'Market score, risks, and opportunity size — readable in minutes, not another essay.',
  },
]

const PACK_FEATURES: Record<string, string[]> = {
  starter: ['1 full analysis credit', 'Shallow / Standard / Deep depth', 'Quotes + verdict included', 'Credits never expire'],
  founder: ['5 full analysis credits', 'Compare multiple ideas', 'Best value per credit', 'Credits never expire'],
  indie: ['20 full analysis credits', 'High-volume validation', 'Lowest cost per run', 'Credits never expire'],
}

function packFeatures(pack: ResearchPackInfo): string[] {
  return (
    PACK_FEATURES[pack.id] ?? [
      `${pack.credits} full ${pack.credits === 1 ? 'analysis' : 'analyses'}`,
      'Quotes + verdict included',
      'Credits never expire',
    ]
  )
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
        {/* Hero — Linear intake rhythm: split copy, then full-bleed product */}
        <section className="relative overflow-hidden pt-20 md:pt-24">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <div className="grid gap-8 pb-10 pt-8 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-12 md:pb-12 md:pt-14">
              <h1 className="max-w-xl text-[2.15rem] font-semibold leading-[1.08] tracking-tight text-v-on sm:text-5xl md:text-[3.25rem] md:leading-[1.05]">
                Find out if your idea is worth the next three months
              </h1>
              <div className="max-w-md md:justify-self-end md:pb-1">
                <p className="text-[15px] leading-relaxed text-v-muted md:text-base">
                  Turn market complaints into a decision — quotes, frequency, and a clear build /
                  pivot / don&apos;t-build verdict.
                </p>
                <a
                  href="#method"
                  className="mt-4 inline-flex items-center font-landing-mono text-[12px] text-v-muted transition-colors hover:text-v-on"
                >
                  0.1 Method
                </a>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1200px] px-5 pb-8 md:px-8 md:pb-10">
            <LandingHeroStage />
          </div>

          <div className="mx-auto flex max-w-[1120px] flex-col items-stretch gap-3 px-5 pb-16 sm:flex-row sm:items-center sm:justify-center md:px-8 md:pb-24">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-v-on px-8 text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
            >
              Start free preview
            </Link>
            <Link
              href="/library"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/14 px-8 text-sm font-medium text-v-on transition-colors hover:border-white/28 hover:bg-white/[0.03]"
            >
              Browse library
            </Link>
          </div>
        </section>

        {/* Method — FIG + line art */}
        <section id="method" className="border-t border-white/[0.06] py-20 md:py-28">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <h2 className="mb-14 max-w-2xl text-2xl font-semibold tracking-tight text-v-on md:mb-20 md:text-[2rem]">
              The standard for validating ideas with evidence
            </h2>

            <div className="grid gap-12 md:grid-cols-3 md:gap-10">
              {STEPS.map((item, index) => (
                <LandingReveal key={item.fig} delayMs={index * 90}>
                  <div>
                    <item.Icon className="h-[294px] w-[353px] max-w-full md:h-[336px] md:w-[403px]" />
                    <h3 className="mt-6 text-base font-semibold text-v-on">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-v-muted">{item.body}</p>
                  </div>
                </LandingReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Inside the report — Monitor / Stripe analytics language */}
        <section id="report" className="border-t border-white/[0.06] py-20 md:py-28">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <div className="mb-10 grid gap-4 md:mb-12 md:grid-cols-[1fr_1fr] md:items-end md:gap-12">
              <h2 className="text-2xl font-semibold tracking-tight text-v-on md:text-[2rem]">
                Understand the market at a glance
              </h2>
              <div className="md:justify-self-end md:text-right">
                <p className="max-w-md text-sm leading-relaxed text-v-muted md:ml-auto">
                  KPI strip, pain frequency, and opportunity size — calm analytics, not a wall of
                  generated prose.
                </p>
                <a
                  href="#pricing"
                  className="mt-3 inline-flex items-center font-landing-mono text-[12px] text-v-muted transition-colors hover:text-v-on"
                >
                  5.0 Pricing
                </a>
              </div>
            </div>
            <LandingReveal>
              <LandingReportStage />
            </LandingReveal>
          </div>
        </section>

        {/* Quote proof */}
        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <div className="grid gap-3 overflow-hidden md:grid-cols-[0.72fr_1.28fr] md:gap-3">
              <LandingReveal>
                <figure className="flex h-full flex-col justify-between rounded-2xl bg-[#1f6f66] px-7 py-9 text-[#e8f6f3] md:px-8 md:py-12">
                  <blockquote className="text-[1.25rem] font-semibold leading-[1.25] tracking-tight md:text-[1.4rem]">
                    &ldquo;Our speed is limited. Vantage helped us kill a bad idea in an afternoon.&rdquo;
                  </blockquote>
                  <figcaption className="mt-10">
                    <p className="text-sm font-medium">Jon K.</p>
                    <p className="text-sm opacity-65">Indie hacker · Marketplace</p>
                  </figcaption>
                </figure>
              </LandingReveal>
              <LandingReveal delayMs={100}>
                <figure className="flex h-full flex-col justify-between rounded-2xl bg-[#e6e0d6] px-7 py-9 text-[#1a1814] md:px-10 md:py-12">
                  <blockquote className="text-[1.35rem] font-semibold leading-[1.25] tracking-tight md:text-[1.65rem]">
                    &ldquo;I stopped arguing with myself in Notion. The quotes made the gap obvious
                    in one sitting.&rdquo;
                  </blockquote>
                  <figcaption className="mt-10">
                    <p className="text-sm font-medium">Maya R.</p>
                    <p className="text-sm opacity-60">Solo founder · B2B SaaS</p>
                  </figcaption>
                </figure>
              </LandingReveal>
            </div>

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-v-muted">
                Built for founders who need{' '}
                <span className="font-medium text-v-on">evidence</span> before months of work —
                not another AI essay.
              </p>
              <Link
                href="/library"
                className="shrink-0 text-sm text-v-on transition-opacity hover:opacity-70"
              >
                Research library
              </Link>
            </div>
          </div>
        </section>

        {/* Run steps — Stripe numbered process + GitHub commit density */}
        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <div className="mb-10 grid gap-3 md:mb-12 md:grid-cols-[1fr_1fr] md:items-end">
              <h2 className="text-2xl font-semibold tracking-tight text-v-on md:text-[2rem]">
                How a run works
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-v-muted md:justify-self-end md:text-right">
                Three stages. Live counters while it runs. Evidence in the report — not a black box.
              </p>
            </div>

            <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {RUN_STEPS.map((item, index) => (
                <LandingReveal key={item.step} delayMs={index * 70}>
                  <li className="grid gap-3 py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6 md:py-7">
                    <span className="font-landing-mono text-sm tabular-nums text-v-muted">
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-medium text-v-on md:text-[1.05rem]">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-v-muted">
                        {item.body}
                      </p>
                    </div>
                    <span className="font-landing-mono text-[11px] text-v-muted sm:justify-self-end">
                      {item.code}
                    </span>
                  </li>
                </LandingReveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Depth */}
        <section className="border-t border-white/[0.06] py-16 md:py-24">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <div className="mb-10 max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-v-on">
                Pay for the depth you need
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-v-muted">
                After the free preview, choose how many reviews to analyze. Deeper runs cost more
                credits and surface stronger patterns.
              </p>
            </div>

            <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {DEPTH_ROWS.map((row) => (
                <div
                  key={row.depth}
                  className="flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                    <span className="w-28 text-sm font-medium text-v-on">{row.depth}</span>
                    <span className="font-landing-mono text-xs text-v-muted">{row.scope}</span>
                  </div>
                  <span className="font-landing-mono text-xs tabular-nums text-v-primary">
                    {row.credits}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Library */}
        {featuredArticles.length > 0 && (
          <section className="border-t border-white/[0.06] py-16 md:py-24">
            <div className="mx-auto max-w-[1120px] px-5 md:px-8">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-2 font-landing-mono text-[11px] uppercase tracking-[0.16em] text-v-muted">
                    Research library
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-v-on">
                    Public market research you can verify
                  </h2>
                </div>
                <Link
                  href="/library"
                  className="text-sm text-v-muted transition-colors hover:text-v-on"
                >
                  View all
                </Link>
              </div>

              <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {featuredArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/library/${article.slug}`}
                    className="group flex flex-col gap-3 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <span className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                        {article.category}
                      </span>
                      <h3 className="mt-1 text-base font-medium text-v-on group-hover:underline group-hover:underline-offset-4">
                        {article.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 gap-6 font-landing-mono text-[11px] tabular-nums text-v-muted">
                      <span>{article.products_count} products</span>
                      <span>{article.reviews_count} reviews</span>
                      <span className="hidden sm:inline">{article.market_saturation}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing — Stripe-style separate product cards */}
        <section id="pricing" className="border-t border-white/[0.06] py-16 md:py-28">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8">
            <div className="mb-12 max-w-2xl md:mb-14">
              <h2 className="text-2xl font-semibold tracking-tight text-v-on md:text-3xl">
                One-time packs, no subscription
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-v-muted md:text-base">
                1 credit = one full analysis at shallow depth. Buy once, use when you need it.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 md:gap-5">
              {packs.map((pack, index) => {
                const popular = pack.id === 'founder'
                const features = packFeatures(pack)
                return (
                  <LandingReveal key={pack.id} delayMs={index * 80}>
                    <article
                      className={
                        popular
                          ? 'relative flex h-full flex-col rounded-xl border border-v-secondary/40 bg-v-surface p-6 md:p-7'
                          : 'relative flex h-full flex-col rounded-xl border border-white/[0.1] bg-transparent p-6 md:p-7'
                      }
                    >
                      {popular && (
                        <span className="absolute -top-3 left-6 rounded-md bg-v-secondary px-2 py-0.5 text-[11px] font-medium text-v-bg">
                          Recommended
                        </span>
                      )}

                      <header>
                        <h3 className="text-[15px] font-medium text-v-on">{pack.label}</h3>
                        <p className="mt-1 text-sm text-v-muted">{pack.tagline}</p>
                      </header>

                      <div className="mt-6 flex items-baseline gap-1.5">
                        <span className="text-4xl font-semibold tracking-tight tabular-nums text-v-on">
                          ${pack.price_usd}
                        </span>
                        <span className="text-sm text-v-muted">USD</span>
                      </div>
                      <p className="mt-1 text-xs text-v-muted">One-time payment</p>

                      <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/[0.06] pt-6">
                        {features.map((feature) => (
                          <li key={feature} className="flex gap-2.5 text-sm text-v-muted">
                            <svg
                              className="mt-0.5 h-4 w-4 shrink-0 text-v-secondary"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href="/signup"
                        className={
                          popular
                            ? 'mt-7 inline-flex h-11 w-full items-center justify-center rounded-lg bg-v-on text-sm font-medium text-v-bg transition-opacity hover:opacity-90'
                            : 'mt-7 inline-flex h-11 w-full items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] text-sm font-medium text-v-on transition-colors hover:border-white/25 hover:bg-white/[0.06]'
                        }
                      >
                        {popular ? 'Get Founder Pack' : `Choose ${pack.label.split(' ')[0]}`}
                      </Link>
                    </article>
                  </LandingReveal>
                )
              })}
            </div>

            <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-xl border border-white/[0.08] bg-v-surface/60 px-6 py-8 sm:flex-row sm:items-center md:px-8">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-v-on">
                  Not sure yet?
                </h3>
                <p className="mt-1 text-sm text-v-muted">
                  Start with a free market teaser — no credit required.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-v-on px-5 text-sm font-medium text-v-bg transition-opacity hover:opacity-90"
                >
                  Start free preview
                </Link>
                <Link
                  href="/support"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/14 px-5 text-sm font-medium text-v-on transition-colors hover:border-white/25"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-14 md:grid-cols-12 md:gap-8 md:px-8">
          <div className="md:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <VantageLogo size={18} />
              <span className="font-semibold text-v-on">Vantage</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-v-muted">
              Evidence-grade market pain research for technical founders.
            </p>
          </div>
          <div className="md:col-span-2">
            <h4 className="mb-3 text-[13px] font-medium text-v-on">Product</h4>
            <ul className="space-y-2 text-sm text-v-muted">
              <li>
                <a href="#method" className="transition-colors hover:text-v-on">
                  Method
                </a>
              </li>
              <li>
                <a href="#report" className="transition-colors hover:text-v-on">
                  Report
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition-colors hover:text-v-on">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/library" className="transition-colors hover:text-v-on">
                  Library
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="mb-3 text-[13px] font-medium text-v-on">Account</h4>
            <ul className="space-y-2 text-sm text-v-muted">
              <li>
                <Link href="/login" className="transition-colors hover:text-v-on">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="transition-colors hover:text-v-on">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="mb-3 text-[13px] font-medium text-v-on">Resources</h4>
            <ul className="space-y-2 text-sm text-v-muted">
              <li>
                <Link href="/support" className="transition-colors hover:text-v-on">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/library" className="transition-colors hover:text-v-on">
                  Research library
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="mb-3 text-[13px] font-medium text-v-on">Status</h4>
            <p className="flex items-center gap-2 text-sm text-v-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-v-tertiary" aria-hidden />
              Operational
            </p>
            <p className="mt-3 font-landing-mono text-[11px] text-v-muted">
              Sources: G2 · Capterra
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-4 font-landing-mono text-[11px] text-v-muted sm:flex-row md:px-8">
          <span>© {new Date().getFullYear()} Vantage</span>
          <span>Market pain research</span>
        </div>
      </footer>
    </div>
  )
}
