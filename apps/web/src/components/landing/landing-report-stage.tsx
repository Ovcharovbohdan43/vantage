/**
 * Stripe-language analytics fragment for the "Inside the report" section.
 */
export function LandingReportStage() {
  const bars = [28, 44, 36, 62, 48, 78, 55, 70, 42, 88, 64, 72]

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-v-surface">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-v-on">Weekly signal · Jul 13</p>
          <p className="mt-0.5 font-landing-mono text-[11px] text-v-muted">
            Pain frequency across collected reviews
          </p>
        </div>
        <div className="flex gap-6 font-landing-mono text-[11px]">
          <div>
            <p className="text-v-muted">Critical</p>
            <p className="mt-0.5 text-sm tabular-nums text-v-error">34%</p>
          </div>
          <div>
            <p className="text-v-muted">At risk</p>
            <p className="mt-0.5 text-sm tabular-nums text-v-warn">2 themes</p>
          </div>
          <div>
            <p className="text-v-muted">Verdict</p>
            <p className="mt-0.5 text-sm text-v-primary">Build</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border-b border-white/[0.06] px-5 py-6 lg:border-r lg:border-b-0">
          <p className="mb-4 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Mentions by week
          </p>
          <div className="flex h-36 items-end gap-1.5 sm:gap-2">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-v-secondary/80"
                style={{ height: `${h}%`, opacity: 0.35 + (h / 100) * 0.65 }}
              />
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="mb-3 font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
            Top opportunities
          </p>
          <ul className="space-y-3">
            {[
              { title: 'Silent sync failure alerts', size: 'Large' },
              { title: 'SKU drift notifications', size: 'Medium' },
              { title: 'Reliable multi-warehouse export', size: 'Medium' },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-v-on">{item.title}</span>
                <span className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted">
                  {item.size}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
