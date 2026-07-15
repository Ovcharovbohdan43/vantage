import type { IdeaOfWeek } from '@/lib/api/idea-of-week'
import type { LibraryArticle, LibraryPainPoint } from '@/lib/api/library'
import type { ReportPainCluster, ResearchReport } from '@/lib/api/types'

export const VANTAGE_URL = 'https://www.vantageserch.app/'
export const SHARE_INTRO = 'I analyzed a startup idea and the results surprised me.'

export interface SharePayload {
  title: string
  text: string
  url: string
  privateReport?: boolean
}

export type ShareDraft = Pick<SharePayload, 'title' | 'text'>

export type ShareDraftSource =
  | { kind: 'report'; projectId: string }
  | { kind: 'library'; slug: string }
  | { kind: 'idea-of-week'; week: string }

export type SocialChannel = 'reddit' | 'x' | 'linkedin'

function clean(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function truncate(value: string, max = 360) {
  const normalized = clean(value)
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function score(value: number) {
  return `${Math.round(value)}/100`
}

function painMetric(pain: ReportPainCluster | LibraryPainPoint) {
  if (pain.mention_count && pain.mention_count > 0) {
    return `${formatNumber(pain.mention_count)} mentions`
  }
  if (pain.share_pct && pain.share_pct > 0) {
    return `${Math.round(pain.share_pct)}% of pain signals`
  }
  if (pain.frequency > 0) return `${formatNumber(pain.frequency)} signals`
  return null
}

function painLines(pains: Array<ReportPainCluster | LibraryPainPoint>, limit = 3) {
  return pains.slice(0, limit).map((pain) => {
    const metric = painMetric(pain)
    return `- ${clean(pain.title)}${metric ? ` — ${metric}` : ''}`
  })
}

function section(title: string, body: string | string[]) {
  const lines = Array.isArray(body) ? body.filter(Boolean) : [body]
  return lines.length ? [`${title}:`, ...lines].join('\n') : ''
}

function joinSections(parts: string[]) {
  return parts.filter(Boolean).join('\n\n')
}

function publicLibraryUrl(slug: string) {
  return `${VANTAGE_URL}library/${encodeURIComponent(slug)}`
}

export function buildAuthenticatedReportPost(report: ResearchReport): SharePayload {
  const topPains = report.pain_clusters.slice(0, 3)
  const competitors = report.competitors
    .slice(0, 5)
    .map((item) => clean(item.name))
    .filter(Boolean)
  const mvpDirections = topPains
    .flatMap((pain) => [
      ...(pain.feature_requests ?? []).slice(0, 1).map((request) => clean(request.label)),
      clean(pain.solution_direction),
    ])
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .slice(0, 3)
    .map((value) => `- ${value}`)

  const evidence = [
    report.stats.reviews_analyzed > 0 ? `${formatNumber(report.stats.reviews_analyzed)} reviews analyzed` : '',
    report.stats.products_analyzed > 0 ? `${formatNumber(report.stats.products_analyzed)} competing products` : '',
    report.stats.clusters_found > 0 ? `${formatNumber(report.stats.clusters_found)} distinct pain clusters` : '',
    report.stats.pain_signals > 0 ? `${formatNumber(report.stats.pain_signals)} negative signals` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const text = joinSections([
    SHARE_INTRO,
    section('The idea I checked', truncate(report.idea.description || report.idea.title, 500)),
    report.idea.target_audience
      ? section('Who it is for', truncate(report.idea.target_audience, 260))
      : '',
    evidence ? section('What I found', evidence) : '',
    section(
      'Market signal',
      `Opportunity ${score(report.scores.market_score)} · Risk ${score(report.scores.risk_score)} · ${report.scores.market_saturation.toLowerCase()} saturation · ${report.scores.data_confidence.toLowerCase()} confidence`,
    ),
    topPains.length ? section('The competitor gaps that stood out', painLines(topPains)) : '',
    competitors.length ? section('Products in the comparison', competitors.join(', ')) : '',
    mvpDirections.length
      ? section('A practical MVP wedge', [
          ...mvpDirections,
          'Start narrow, solve these proven failures first, and validate the workflow before expanding the scope.',
        ])
      : '',
    section(
      'My takeaway',
      truncate(
        report.recommendations.opportunity_reasoning ||
          report.recommendations.reasoning ||
          report.summary,
        520,
      ),
    ),
    `Report created with Vantage: ${VANTAGE_URL}`,
  ])

  return {
    title: `${report.idea.title}: what the market evidence reveals`,
    text,
    url: VANTAGE_URL,
    privateReport: true,
  }
}

export function buildLibraryReportPost(article: LibraryArticle): SharePayload {
  const blueprint = article.content.mvp_blueprint
  const scores = article.content.scores
  const stats = article.content.stats
  const url = publicLibraryUrl(article.slug)
  const evidence = [
    article.content.dataset.reviews_analyzed > 0
      ? `${formatNumber(article.content.dataset.reviews_analyzed)} reviews analyzed`
      : '',
    article.content.dataset.products_analyzed > 0
      ? `${formatNumber(article.content.dataset.products_analyzed)} products compared`
      : '',
    stats ? `${formatNumber(stats.clusters_found)} pain clusters` : '',
    stats ? `${formatNumber(stats.underserved_problems)} underserved problems` : '',
  ].filter(Boolean)

  const marketSignal = scores
    ? `Opportunity ${score(scores.market_score)} · Risk ${score(scores.risk_score)} · ${article.market_saturation.toLowerCase()} saturation · ${scores.data_confidence.toLowerCase()} confidence`
    : `${article.market_saturation.toLowerCase()} saturation · ${article.competition_level.toLowerCase()} competition`

  const mvp = blueprint
    ? [
        truncate(blueprint.product_concept, 420),
        ...blueprint.features.slice(0, 4).map(
          (feature) =>
            `- ${clean(feature.name)}: ${truncate(feature.solution || feature.problem_solved, 220)}`,
        ),
        `Success signal: ${truncate(blueprint.success_metric, 240)}`,
      ]
    : article.content.market_opportunities
        .slice(0, 3)
        .map((opportunity) => `- ${clean(opportunity.title)}: ${truncate(opportunity.body, 220)}`)

  const risks = article.content.risk_analysis
    .slice(0, 2)
    .map((item) => `- ${clean(item.risk)} (${item.level}): ${truncate(item.explanation, 180)}`)

  const text = joinSections([
    SHARE_INTRO,
    section(
      'The idea I checked',
      truncate(blueprint?.product_concept || article.executive_summary, 500),
    ),
    blueprint ? section('Who it is for', truncate(blueprint.target_user, 280)) : '',
    blueprint ? section('Core value', truncate(blueprint.value_proposition, 300)) : '',
    evidence.length ? section('What I found', evidence.join(' · ')) : '',
    section('Market signal', marketSignal),
    article.content.pain_points.length
      ? section('The competitor gaps that stood out', painLines(article.content.pain_points))
      : '',
    mvp.length ? section('How I would turn it into an MVP', mvp) : '',
    risks.length ? section('Risks to test early', risks) : '',
    section('My takeaway', truncate(article.content.final_takeaway, 420)),
    `Full evidence report created with Vantage: ${url}`,
  ])

  return {
    title: `${blueprint?.concept_name || article.title}: evidence-backed startup analysis`,
    text,
    url,
  }
}

export function buildIdeaOfWeekPost(idea: IdeaOfWeek): SharePayload {
  const article = idea.article
  const blueprint = article.content.mvp_blueprint
  const metrics = idea.trend_data.metrics
  const articleScores = article.content.scores
  const url = `${VANTAGE_URL}idea-of-the-week/${encodeURIComponent(idea.week_slug)}`
  const evidence = [
    article.reviews_count > 0 ? `${formatNumber(article.reviews_count)} reviews analyzed` : '',
    article.products_count > 0 ? `${formatNumber(article.products_count)} products compared` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const demand = [
    `current Google Trends interest ${formatNumber(metrics.current_interest)}/100`,
    `${metrics.growth_pct >= 0 ? '+' : ''}${Math.round(metrics.growth_pct)}% recent momentum`,
    `peak interest ${formatNumber(metrics.peak_interest)}/100`,
    `selection score ${score(idea.selection_score)}`,
  ].join(' · ')
  const marketScore = idea.selection_inputs.market_score ?? articleScores?.market_score
  const marketSignal = [
    marketScore !== undefined ? `market opportunity ${score(marketScore)}` : '',
    articleScores ? `risk ${score(articleScores.risk_score)}` : '',
    `${article.market_saturation.toLowerCase()} saturation`,
    `${(idea.selection_inputs.data_confidence ?? articleScores?.data_confidence ?? 'unknown').toLowerCase()} confidence`,
  ]
    .filter(Boolean)
    .join(' · ')
  const mvp = blueprint
    ? [
        truncate(blueprint.product_concept, 420),
        ...blueprint.features.slice(0, 4).map(
          (feature) =>
            `- ${clean(feature.name)}: ${truncate(feature.solution || feature.problem_solved, 220)}`,
        ),
        `Success signal: ${truncate(blueprint.success_metric, 240)}`,
      ]
    : []

  const text = joinSections([
    SHARE_INTRO,
    section('The idea I checked', truncate(idea.dek, 500)),
    blueprint ? section('Who it is for', truncate(blueprint.target_user, 280)) : '',
    section(
      'Why now',
      `Search momentum is ${metrics.growth_pct >= 0 ? 'rising' : 'cooling'}, while the underlying research still shows unresolved competitor complaints worth testing.`,
    ),
    evidence ? section('What I found', evidence) : '',
    section('Market signal', marketSignal),
    section(`Search demand for “${clean(idea.trend_query)}”`, demand),
    article.content.pain_points.length
      ? section('The competitor gaps that stood out', painLines(article.content.pain_points))
      : '',
    mvp.length ? section('How I would turn it into an MVP', mvp) : '',
    article.content.risk_analysis.length
      ? section(
          'Risks to test early',
          article.content.risk_analysis
            .slice(0, 2)
            .map((item) => `- ${clean(item.risk)} (${item.level}): ${truncate(item.explanation, 180)}`),
        )
      : '',
    section('My takeaway', truncate(article.content.final_takeaway, 420)),
    `Full weekly report created with Vantage: ${url}`,
  ])

  return {
    title: `${blueprint?.concept_name || idea.headline}: Idea of the Week`,
    text,
    url,
  }
}

export function buildSocialShareUrl(
  channel: SocialChannel,
  payload: Pick<SharePayload, 'title' | 'text' | 'url'>,
) {
  if (channel === 'reddit') {
    const url = new URL('https://www.reddit.com/submit')
    url.searchParams.set('title', payload.title)
    url.searchParams.set('text', payload.text)
    return url.toString()
  }

  if (channel === 'x') {
    const url = new URL('https://twitter.com/intent/tweet')
    url.searchParams.set('text', truncate(payload.title, 180))
    url.searchParams.set('url', payload.url)
    return url.toString()
  }

  const url = new URL('https://www.linkedin.com/sharing/share-offsite/')
  url.searchParams.set('url', payload.url)
  return url.toString()
}
