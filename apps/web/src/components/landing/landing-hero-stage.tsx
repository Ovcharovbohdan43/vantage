import Image from 'next/image'

/** Full-bleed product proof that dissolves into the hero background. */
export function LandingHeroStage() {
  return (
    <div className="landing-product-proof relative mx-auto w-full max-w-[1200px]">
      <div
        className="pointer-events-none absolute inset-x-[12%] top-[6%] h-[68%] rounded-full bg-v-primary/[0.09] blur-[100px]"
        aria-hidden
      />
      <div className="landing-product-proof-mask relative overflow-hidden">
        <Image
          src="/images/idea-of-week-preview.png"
          alt="Vantage Idea of the Week report showing Google search demand and evidence-backed selection metrics"
          width={1024}
          height={512}
          priority
          sizes="(max-width: 768px) 130vw, 1200px"
          className="h-auto w-full min-w-[680px] max-w-none translate-x-[-15%] border border-white/[0.07] object-cover shadow-[0_36px_120px_rgba(0,0,0,0.55)] sm:min-w-0 sm:translate-x-0"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-v-bg"
        aria-hidden
      />
    </div>
  )
}
