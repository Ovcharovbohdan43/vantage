import type { ResearchReport } from '@/lib/api/types'

const VERDICT_LABELS = {
  build: 'Build',
  pivot: 'Pivot',
  dont_build: "Don't build",
} as const

export function reportToMarkdown(report: ResearchReport): string {
  const lines: string[] = [
    `# ${report.idea.title}`,
    '',
    `**Category:** ${report.idea.category}`,
    `**Generated:** ${new Date(report.created_at).toLocaleString()}`,
    '',
    '## Scores',
    '',
    `- Market score: **${Math.round(report.scores.market_score)}/100**`,
    `- Risk score: **${Math.round(report.scores.risk_score)}/100**`,
    `- Market saturation: **${report.scores.market_saturation}**`,
    `- Data confidence: **${report.scores.data_confidence}**`,
    '',
    '## Recommendation',
    '',
    `**${VERDICT_LABELS[report.recommendations.verdict]}**`,
    '',
    report.recommendations.reasoning,
    '',
  ]

  if (report.recommendations.next_steps.length > 0) {
    lines.push('### Next steps', '')
    for (const step of report.recommendations.next_steps) {
      lines.push(`- ${step}`)
    }
    lines.push('')
  }

  lines.push('## Summary', '', report.summary, '')

  lines.push(`## Pain clusters (${report.pain_clusters.length})`, '')
  if (report.pain_clusters.length === 0) {
    lines.push('_No pain clusters identified._', '')
  } else {
    for (const cluster of report.pain_clusters) {
      lines.push(`### ${cluster.title}`, '')
      lines.push(
        `_Frequency: ${cluster.frequency}${cluster.severity_score != null ? ` · Severity: ${cluster.severity_score.toFixed(1)}/10` : ''}_`,
        '',
      )
      if (cluster.description) {
        lines.push(cluster.description, '')
      }
      if (cluster.solution_direction) {
        lines.push(`**Killer feature wedge:** ${cluster.solution_direction}`, '')
      }
      for (const quote of cluster.quotes) {
        const meta = [quote.competitor, quote.rating != null ? `${quote.rating}/5` : null, quote.source?.toUpperCase()]
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

  lines.push('')
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
