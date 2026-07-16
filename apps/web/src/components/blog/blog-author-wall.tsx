import Image from 'next/image'

export function BlogAuthorWall() {
  return (
    <section className="mb-8 border-b border-white/[0.06] pb-8 sm:mb-10 sm:pb-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 sm:h-24 sm:w-24">
          <Image
            src="/blog/author-avatar.png"
            alt="Bohdan — founder of Vantage"
            fill
            className="object-cover"
            sizes="96px"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-landing-mono text-[10px] uppercase tracking-[0.2em] text-v-muted">
            Founder notes
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-v-on sm:text-xl">Bohdan</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-v-muted md:text-[15px]">
            Building{' '}
            <span className="text-v-on">Vantage</span> — market validation from real negative reviews.
            This wall is where I write about startup research, product decisions, and lessons from
            shipping in public. Dense like GitHub commits, clear like Stripe docs, focused like
            Linear.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Startups', 'Market research', 'Building in public'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
