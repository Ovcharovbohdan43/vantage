import type { ResearchReport } from '@/lib/api/types'

export function reportToMarkdown(report: ResearchReport): string {
  const size = report.recommendations.opportunity_size
  const reasoning =
    report.recommendations.opportunity_reasoning || report.recommendations.reasoning || ''

  const lines: string[] = [
    `# ${report.idea.title}`,
    '',
    `**Category:** ${report.idea.category}`,
    `**Generated:** ${new Date(report.created_at).toLocaleString()}`,
    '',
    '## Opportunity size',
    '',
    `- Opportunity score: **${Math.round(report.scores.market_score)}/100**`,
    `- Risk score: **${Math.round(report.scores.risk_score)}/100**`,
    `- Market saturation: **${report.scores.market_saturation}**`,
    `- Data confidence: **${report.scores.data_confidence}**`,
    '',
  ]

  if (size) {
    lines.push(
      `- Reviews analyzed: **${size.reviews_analyzed}**`,
      `- Negative signals: **${size.negative_signals}**`,
      `- Pain clusters: **${size.clusters_found}**`,
      `- Underserved problems: **${size.underserved_problems}**`,
      '',
    )
  }

  if (reasoning) {
    lines.push(reasoning, '')
  }

  lines.push(`## Biggest opportunities (${report.pain_clusters.length})`, '')
  if (report.pain_clusters.length === 0) {
    lines.push('_No pain clusters identified._', '')
  } else {
    for (const [index, cluster] of report.pain_clusters.entries()) {
      const mention = cluster.mention_count ?? cluster.frequency
      const share = cluster.share_pct != null ? ` · ${cluster.share_pct}%` : ''
      lines.push(`### #${index + 1} ${cluster.title}`, '')
      lines.push(
        `_Mentions: ${mention}${share}${cluster.severity_score != null ? ` · Severity: ${cluster.severity_score.toFixed(1)}/10` : ''}${cluster.trend ? ` · Trend: ${cluster.trend}` : ''}_`,
        '',
      )
      if (cluster.why_opportunity) {
        lines.push(cluster.why_opportunity, '')
      }
      if (cluster.description) {
        lines.push(cluster.description, '')
      }

      const subThemes = cluster.sub_themes ?? []
      if (subThemes.length > 0) {
        lines.push('**What specifically irritates them**', '')
        for (const theme of subThemes) {
          lines.push(`- ${theme.frequency} — ${theme.title}`)
        }
        lines.push('')
      }

      const competitors = cluster.competitors ?? []
      if (competitors.length > 0) {
        lines.push('**Who gets these complaints**', '')
        for (const row of competitors) {
          lines.push(`- ${row.name}: ${row.complaints}`)
        }
        lines.push('')
      }

      const terms = cluster.top_terms ?? []
      if (terms.length > 0) {
        lines.push(
          `**Words customers repeat:** ${terms.map((t) => `${t.term}×${t.count}`).join(', ')}`,
          '',
        )
      }

      const requests = cluster.feature_requests ?? []
      if (requests.length > 0) {
        lines.push('**What users asked for**', '')
        for (const req of requests) {
          lines.push(`- ${req.count} — ${req.label}`)
        }
        lines.push('')
      }

      const yearCounts = cluster.year_counts ?? []
      if (yearCounts.length >= 2 && (cluster.date_coverage ?? 0) >= 0.4) {
        lines.push('**By year**', '')
        for (const row of yearCounts) {
          lines.push(`- ${row.year}: ${row.count}`)
        }
        lines.push('')
      }

      for (const quote of cluster.quotes) {
        const meta = [
          quote.competitor,
          quote.rating != null ? `${quote.rating}/5` : null,
          quote.source?.toUpperCase(),
        ]
          .filter(Boolean)
          .join(' · ')
        lines.push(`> "${quote.text}"${meta ? `\n> — ${meta}` : ''}`, '')
      }
    }
  }

  lines.push(`## Competitors (${report.competitors.length})`, '')
  for (const c of report.competitors) {
    lines.push(
      `- **${c.name}** (${c.source.toUpperCase()})${c.rating != null ? ` · ${c.rating.toFixed(1)}★` : ''}${c.reviews_count != null ? ` · ${c.reviews_count} reviews` : ''} — ${c.url}`,
    )
  }

  lines.push('', '## Short AI summary', '', report.summary, '')
  return lines.join('\n')
}

export function downloadReportMarkdown(report: ResearchReport) {
  const markdown = reportToMarkdown(report)
  const slug = report.idea.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${slug || 'report'}.md`
  anchor.click()
  URL.revokeObjectURL(url)
}
