/**
 * Layered product stage — Linear "product as proof" language:
 * pipeline log floats over a dense report board.
 */
export function LandingHeroStage() {
  return (
    <div className="landing-hero-stage relative mx-auto w-full max-w-[1120px] sm:min-h-[420px] md:min-h-[460px]">
      {/* Back layer — pain board */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-v-surface sm:ml-[28%] md:ml-[30%]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-landing-mono text-[11px] text-v-muted">Report</span>
            <span className="text-v-muted/50">·</span>
            <span className="truncate text-[11px] text-v-muted">Inventory sync for Shopify apps</span>
          </div>
          <div className="hidden items-center gap-3 font-landing-mono text-[10px] text-v-muted sm:flex">
            <span>
              Todo <span className="text-v-on">8</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-v-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-v-warn" aria-hidden />
              In progress 3
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-white/[0.06]">
          {[
            { label: 'Reviews', value: '847' },
            { label: 'Clusters', value: '12' },
            { label: 'Score', value: '64' },
          ].map((kpi) => (
            <div key={kpi.label} className="border-r border-white/[0.06] px-3 py-3 last:border-r-0 sm:px-5">
              <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                {kpi.label}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-v-on">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          <div className="border-b border-white/[0.06] sm:border-r sm:border-b-0">
            <div className="flex items-center justify-between px-4 py-2.5 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
              <span>Pain map</span>
              <span>Freq</span>
            </div>
            {[
              { id: 'P-01', title: 'Sync fails silently overnight', tag: 'Bug', tagClass: 'text-v-error', freq: '34%' },
              { id: 'P-02', title: 'No alert when SKU drifts', tag: 'Ops', tagClass: 'text-v-warn', freq: '28%' },
              { id: 'P-03', title: 'CSV export truncates variants', tag: 'Data', tagClass: 'text-v-info', freq: '19%' },
              { id: 'P-04', title: 'Multi-warehouse lag on peak', tag: 'Scale', tagClass: 'text-v-secondary', freq: '15%' },
            ].map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-landing-mono text-[10px] text-v-muted">{row.id}</span>
                    <span className={`font-landing-mono text-[10px] ${row.tagClass}`}>{row.tag}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-v-on">{row.title}</p>
                </div>
                <span className="shrink-0 font-landing-mono text-xs tabular-nums text-v-muted">
                  {row.freq}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <div className="px-4 py-2.5 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
              Competitors
            </div>
            {[
              { name: 'StockSync Pro', overlap: 'High', reviews: 210 },
              { name: 'ShelfWise', overlap: 'Med', reviews: 164 },
              { name: 'ParcelGrid', overlap: 'Med', reviews: 98 },
              { name: 'BinRoute', overlap: 'Low', reviews: 71 },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-3"
              >
                <div>
                  <p className="text-[13px] text-v-on">{c.name}</p>
                  <p className="font-landing-mono text-[10px] text-v-muted">{c.reviews} reviews</p>
                </div>
                <span className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                  {c.overlap}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Front layer — pipeline / evidence thread */}
      <div className="landing-hero-float relative z-10 mt-4 w-full overflow-hidden rounded-xl border border-white/[0.1] bg-v-surface-high shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:absolute sm:top-8 sm:left-0 sm:mt-0 sm:w-[300px] md:top-10 md:w-[320px]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
          <span className="text-[13px] font-medium text-v-on">Pipeline</span>
          <span className="font-landing-mono text-[10px] text-v-secondary">live</span>
        </div>
        <div className="space-y-3 px-3.5 py-3.5 font-landing-mono text-[11px] leading-relaxed">
          <p className="text-v-muted">
            <span className="text-v-on">14:02</span> Mapped 11 competitors in category
          </p>
          <p className="text-v-muted">
            <span className="text-v-on">14:04</span> Collecting G2 negatives…
          </p>
          <p className="text-v-muted">
            <span className="text-v-on">14:07</span> 847 reviews · clustered 12 pains
          </p>
          <div className="rounded-lg border border-white/[0.06] bg-v-bg/60 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-v-muted">Evidence · G2</p>
            <p className="mt-1.5 font-sans text-[12px] leading-snug text-v-on">
              &ldquo;Inventory looked fine in the dashboard and was wrong in every channel.&rdquo;
            </p>
          </div>
          <p className="flex items-center gap-2 text-v-muted">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-v-primary" aria-hidden />
            Writing verdict…
          </p>
        </div>
      </div>
    </div>
  )
}
