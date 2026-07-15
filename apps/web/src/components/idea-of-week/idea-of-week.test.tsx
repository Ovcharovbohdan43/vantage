import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IdeaOfWeekView } from '@/components/idea-of-week/idea-of-week-view'
import type { IdeaOfWeek } from '@/lib/api/idea-of-week'

vi.mock('@/components/idea-of-week/weekly-trend-chart', () => ({
  WeeklyTrendChart: ({ query }: { query: string }) => <div>Trend chart for {query}</div>,
}))

const IDEA: IdeaOfWeek = {
  id: 'weekly-1',
  week_start: '2026-07-13',
  week_slug: '2026-W29',
  headline: "This week's build: Invoice Flow",
  dek: 'Close the books without manual reconciliation.',
  why_this_week: 'Demand is up 24% while finance teams continue to report reconciliation delays.',
  trend_query: 'Invoice Flow',
  trend_data: {
    source: 'serpapi_google_trends',
    date_range: 'today 12-m',
    geo: 'Worldwide',
    points: [{ date: 'Jul 6 – 12, 2026', timestamp: 1783296000, value: 74 }],
    metrics: {
      current_interest: 74,
      previous_interest: 60,
      growth_pct: 23.3,
      peak_interest: 81,
    },
    related_queries: {
      rising: [{ query: 'invoice automation', value: '+120%', growth: 120 }],
      top: [],
    },
  },
  selection_score: 82,
  selection_inputs: {
    market_score: 78,
    data_confidence: 'high',
    candidate_count: 12,
  },
  published_at: '2026-07-13T00:00:00Z',
  article: {
    id: 'article-1',
    slug: 'invoice-software',
    title: 'Is It Worth Building Invoice Software in 2026?',
    category: 'Finance',
    executive_summary: 'Finance teams report recurring delays across incumbent invoice products.',
    market_saturation: 'MEDIUM',
    competition_level: 'medium',
    products_count: 8,
    reviews_count: 420,
    view_count: 10,
    published_at: '2026-07-10T00:00:00Z',
    content: {
      dataset: {
        products_analyzed: 8,
        reviews_analyzed: 420,
        sources: ['G2'],
        rating_range: '1-3',
      },
      market_saturation: {
        level: 'MEDIUM',
        competition_level: 'medium',
        explanation: 'A competitive but unresolved market.',
      },
      pain_points: [],
      market_opportunities: [],
      risk_analysis: [],
      final_takeaway: 'A focused workflow can win.',
      mvp_blueprint: {
        concept_name: 'Invoice Flow',
        product_concept: 'A focused invoice reconciliation product for small finance teams.',
        target_user: 'Small finance teams closing their books without dedicated operations staff.',
        value_proposition: 'Close the books without manual reconciliation.',
        core_workflow: ['Import', 'Reconcile', 'Close'],
        features: [
          {
            name: 'Automatic reconciliation',
            problem_solved: 'Incumbent tools leave invoice matching to manual work.',
            solution: 'Match invoices continuously and surface only exceptions.',
            evidence_cluster_ids: ['cluster-1'],
          },
        ],
        in_scope: ['Automatic reconciliation'],
        out_of_scope: ['General ledger replacement'],
        success_metric: 'A finance user closes the books in under one hour.',
      },
    },
    seo: {
      title: 'Invoice software',
      description: 'Invoice market report',
      slug: 'invoice-software',
      canonical_url: 'https://example.com/library/invoice-software',
      og_title: 'Invoice software',
      og_description: 'Invoice market report',
      twitter_card: 'summary_large_image',
      json_ld: {},
    },
  },
}

describe('IdeaOfWeekView', () => {
  it('connects demand, MVP evidence, source report, and research CTA', () => {
    render(<IdeaOfWeekView idea={IDEA} />)

    expect(screen.getByRole('heading', { name: IDEA.headline })).toBeInTheDocument()
    expect(screen.getByText('Trend chart for Invoice Flow')).toBeInTheDocument()
    expect(screen.getByText('Automatic reconciliation')).toBeInTheDocument()
    expect(screen.getByText('invoice automation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Read source report/i })).toHaveAttribute(
      'href',
      '/library/invoice-software',
    )
    expect(screen.getByRole('link', { name: /Start research/i })).toHaveAttribute(
      'href',
      '/research/new?from=idea-of-the-week&category=Finance',
    )
    expect(screen.getByRole('link', { name: /Browse weekly archive/i })).toHaveAttribute(
      'href',
      '/idea-of-the-week/archive',
    )
  })
})
