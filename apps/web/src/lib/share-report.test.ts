import { describe, expect, it } from 'vitest'
import type { IdeaOfWeek } from '@/lib/api/idea-of-week'
import type { LibraryArticle } from '@/lib/api/library'
import type { ResearchReport } from '@/lib/api/types'
import {
  SHARE_INTRO,
  VANTAGE_URL,
  buildAuthenticatedReportPost,
  buildIdeaOfWeekPost,
  buildLibraryReportPost,
  buildSocialShareUrl,
} from '@/lib/share-report'

const article: LibraryArticle = {
  id: 'article-1',
  slug: 'inventory-sync',
  title: 'Inventory sync market analysis',
  category: 'E-commerce',
  executive_summary: 'Retailers lose sales when inventory drifts between channels.',
  market_saturation: 'MEDIUM',
  competition_level: 'medium',
  products_count: 8,
  reviews_count: 420,
  view_count: 0,
  published_at: '2026-07-13T00:00:00Z',
  content: {
    dataset: {
      products_analyzed: 8,
      reviews_analyzed: 420,
      sources: ['G2'],
      rating_range: '1-3',
    },
    scores: {
      market_score: 78,
      risk_score: 34,
      data_confidence: 'HIGH',
      confidence_pct: 91,
    },
    stats: {
      pain_signals: 190,
      clusters_found: 12,
      major_problems: 4,
      negative_signals: 190,
      underserved_problems: 3,
    },
    market_saturation: {
      level: 'MEDIUM',
      competition_level: 'medium',
      explanation: 'Competitive with unresolved workflow gaps.',
    },
    pain_points: [
      {
        cluster_id: 'c1',
        title: 'Silent stock drift',
        frequency: 86,
        mention_count: 86,
        severity_score: 8,
        explanation: 'Stock changes fail without alerts.',
        why_critical: 'Causes overselling.',
        quotes: [],
        supporting_review_ids: [],
      },
    ],
    competitors: [],
    market_opportunities: [],
    risk_analysis: [
      {
        risk: 'Platform dependency',
        level: 'medium',
        explanation: 'Commerce APIs change frequently.',
      },
    ],
    final_takeaway: 'A narrow reliability layer has room to win.',
    mvp_blueprint: {
      concept_name: 'StockSignal',
      product_concept: 'An inventory reliability layer that catches stock drift before it causes sales.',
      target_user: 'Small multichannel retailers without a dedicated inventory operations team.',
      value_proposition: 'Keep every channel accurate without manual reconciliation.',
      core_workflow: ['Connect', 'Detect', 'Resolve'],
      features: [
        {
          name: 'Drift alerts',
          problem_solved: 'Incumbents fail silently.',
          solution: 'Detect and explain every failed stock update.',
          evidence_cluster_ids: ['c1'],
        },
      ],
      in_scope: ['Drift alerts'],
      out_of_scope: ['Warehouse planning'],
      success_metric: 'Complete one week without an oversell caused by stale stock.',
    },
  },
  seo: {
    title: 'Inventory sync',
    description: 'Evidence-backed inventory research.',
    slug: 'inventory-sync',
    canonical_url: 'https://example.com/incorrect',
    og_title: 'Inventory sync',
    og_description: 'Evidence-backed inventory research.',
    twitter_card: 'summary_large_image',
    json_ld: {},
  },
}

describe('share report post builders', () => {
  it('builds a private report post without leaking its authenticated URL', () => {
    const report = {
      id: 'private-report-id',
      project_id: 'private-project-id',
      access_level: 'full',
      idea: {
        title: 'Inventory reliability',
        description: 'A tool that catches inventory drift across commerce channels.',
        category: 'E-commerce',
        target_audience: 'Small multichannel retailers.',
      },
      scores: {
        market_saturation: 'MEDIUM',
        market_score: 78,
        risk_score: 34,
        data_confidence: 'high',
      },
      summary: 'The evidence supports a narrow reliability wedge.',
      recommendations: {
        verdict: 'pivot',
        reasoning: 'Start with drift alerts.',
        next_steps: [],
        opportunity_reasoning: 'Frequent silent failures create a focused entry point.',
      },
      pain_clusters: [
        {
          id: 'c1',
          title: 'Silent stock drift',
          description: null,
          frequency: 86,
          mention_count: 86,
          severity_score: 8,
          emotional_intensity: 7,
          commercial_opportunity: 9,
          solution_direction: 'Alert operators before stale inventory reaches a storefront.',
          feature_requests: [],
          quotes: [],
        },
      ],
      competitors: [],
      stats: {
        reviews_analyzed: 420,
        pain_signals: 190,
        products_analyzed: 8,
        clusters_found: 12,
        major_problems: 4,
        confidence_pct: 91,
        analysis_duration_sec: 120,
        time_saved_hours: 10,
      },
      created_at: '2026-07-13T00:00:00Z',
    } satisfies ResearchReport

    const payload = buildAuthenticatedReportPost(report)

    expect(payload.text.startsWith(SHARE_INTRO)).toBe(true)
    expect(payload.privateReport).toBe(true)
    expect(payload.url).toBe(VANTAGE_URL)
    expect(payload.text).not.toContain('private-project-id')
    expect(payload.text).not.toContain('private-report-id')
    expect(payload.text.match(/420 reviews analyzed/g)).toHaveLength(1)
  })

  it('builds a public library post with evidence, MVP, risk, and stable report URL', () => {
    const payload = buildLibraryReportPost(article)

    expect(payload.text.startsWith(SHARE_INTRO)).toBe(true)
    expect(payload.text).toContain('420 reviews analyzed')
    expect(payload.text).toContain('Drift alerts')
    expect(payload.text).toContain('Platform dependency')
    expect(payload.url).toBe(`${VANTAGE_URL}library/inventory-sync`)
    expect(payload.text).not.toContain('example.com')
  })

  it('builds the weekly post with non-repeated demand metrics', () => {
    const idea = {
      id: 'weekly-1',
      week_start: '2026-07-13',
      week_slug: '2026-W29',
      headline: 'Inventory reliability is this week’s signal',
      dek: 'Prevent inventory drift across storefronts.',
      why_this_week: 'Search demand is rising while incumbent reliability complaints persist.',
      trend_query: 'inventory sync',
      trend_data: {
        source: 'serpapi_google_trends',
        date_range: 'today 12-m',
        geo: 'Worldwide',
        points: [],
        metrics: {
          current_interest: 74,
          previous_interest: 60,
          growth_pct: 23,
          peak_interest: 81,
        },
        related_queries: { rising: [], top: [] },
      },
      selection_score: 82,
      selection_inputs: {},
      published_at: '2026-07-13T00:00:00Z',
      article,
    } satisfies IdeaOfWeek

    const payload = buildIdeaOfWeekPost(idea)

    expect(payload.text).toContain('current Google Trends interest 74/100')
    expect(payload.text).toContain('+23% recent momentum')
    expect(payload.text.match(/selection score 82\/100/g)).toHaveLength(1)
    expect(payload.url).toBe(`${VANTAGE_URL}idea-of-the-week/2026-W29`)
  })
})

describe('social share URLs', () => {
  it('opens a prefilled Reddit text post without selecting a subreddit', () => {
    const payload = { title: 'A title & result', text: 'Useful\n\npost', url: VANTAGE_URL }
    const reddit = new URL(buildSocialShareUrl('reddit', payload))

    expect(reddit.origin).toBe('https://www.reddit.com')
    expect(reddit.pathname).toBe('/submit')
    expect(reddit.searchParams.get('title')).toBe(payload.title)
    expect(reddit.searchParams.get('text')).toBe(payload.text)
    expect(reddit.searchParams.has('sr')).toBe(false)
  })

  it('uses URL-safe X and LinkedIn intents', () => {
    const payload = { title: 'Inventory & stock', text: 'Post', url: `${VANTAGE_URL}library/a&b` }
    const x = new URL(buildSocialShareUrl('x', payload))
    const linkedin = new URL(buildSocialShareUrl('linkedin', payload))

    expect(x.searchParams.get('text')).toBe(payload.title)
    expect(x.searchParams.get('url')).toBe(payload.url)
    expect(linkedin.searchParams.get('url')).toBe(payload.url)
  })
})
