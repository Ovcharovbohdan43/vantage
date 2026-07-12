export type ResearchStage =
  | 'queued'
  | 'finding_competitors'
  | 'collecting_reviews'
  | 'analyzing'
  | 'generating_report'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ResearchDepth = 'shallow' | 'standard' | 'deep'

export interface JobStats {
  competitors_found: number
  reviews_collected: number
  pain_clusters_found: number
  competitors_scraped?: number
  reviews_analyzed?: number
  warnings?: string[]
}

export interface ResearchJob {
  id: string
  status: string
  stage: ResearchStage
  progress_pct: number
  stats: JobStats
  error: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface Project {
  id: string
  title: string
  description: string
  target_audience: string | null
  category: string
  research_depth: ResearchDepth
  research_mode?: ResearchMode
  research_plan?: ResearchPlan
  sources: string[]
  status: string
  created_at: string
  updated_at: string
  latest_job: ResearchJob | null
}

export interface ProjectListResponse {
  items: Project[]
  total: number
}

export interface CreateProjectPayload {
  title?: string
  description: string
  target_audience?: string
  category: string
  research_mode?: ResearchMode
  research_depth?: ResearchDepth
  sources: string[]
  analysis_language?: string
}

export interface ProjectStatusResponse {
  project_id: string
  project_status: string
  job: ResearchJob
}

export type MarketSaturation = 'HIGH' | 'MEDIUM' | 'LOW'
export type ReportVerdict = 'build' | 'pivot' | 'dont_build'
export type DataConfidence = 'high' | 'medium' | 'low'
export type ResearchPack = 'starter' | 'founder' | 'indie'
export type ResearchMode = 'preview' | 'full'
export type ResearchPlan = 'preview' | 'starter' | 'founder' | 'indie' | ResearchDepth

export interface CreditsBalance {
  free_preview_available: boolean
  starter_credits: number
  founder_credits: number
  indie_credits: number
  total_credits: number
  depth_credit_costs: Record<ResearchDepth, number>
  can_run_preview: boolean
  can_run_full: boolean
}

export interface ResearchPackInfo {
  id: ResearchPack
  label: string
  price_usd: number
  credits: number
  tagline: string
}

export interface ReportQuote {
  text: string
  rating: number | null
  competitor: string | null
  source: string | null
  review_date?: string | null
}

export interface ReportSubTheme {
  title: string
  frequency: number
  share_pct?: number | null
}

export interface ReportCompetitorComplaint {
  name: string
  complaints: number
}

export interface ReportTermCount {
  term: string
  count: number
}

export interface ReportFeatureRequest {
  label: string
  count: number
  examples?: string[]
}

export interface ReportYearCount {
  year: number
  count: number
}

export interface ReportOpportunitySize {
  reviews_analyzed: number
  negative_signals: number
  clusters_found: number
  underserved_problems: number
}

export interface ReportPainCluster {
  id: string
  title: string
  description: string | null
  frequency: number
  mention_count?: number | null
  share_pct?: number | null
  negative_share_pct?: number | null
  severity_score: number | null
  emotional_intensity: number | null
  commercial_opportunity: number | null
  solution_direction: string | null
  trend?: 'growing' | 'flat' | 'declining' | null
  year_counts?: ReportYearCount[]
  date_coverage?: number | null
  competitors?: ReportCompetitorComplaint[]
  top_terms?: ReportTermCount[]
  feature_requests?: ReportFeatureRequest[]
  sub_themes?: ReportSubTheme[]
  why_opportunity?: string | null
  quotes: ReportQuote[]
}

export interface ReportCompetitor {
  id: string
  name: string
  url: string
  source: string
  rating: number | null
  reviews_count: number | null
  negative_reviews_count?: number | null
  top_complaints?: string[]
}

export interface ReportStats {
  reviews_analyzed: number
  pain_signals: number
  products_analyzed: number
  clusters_found: number
  major_problems: number
  confidence_pct: number
  analysis_duration_sec: number | null
  time_saved_hours: number
}

export interface ResearchReport {
  id: string
  project_id: string
  access_level: ResearchMode
  preview_stats?: {
    competitors_found: number
    reviews_analyzed: number
    top_pain_titles: string[]
  } | null
  idea: {
    title: string
    description: string
    category: string
    target_audience: string | null
  }
  scores: {
    market_saturation: MarketSaturation
    market_score: number
    risk_score: number
    data_confidence: DataConfidence
  }
  summary: string
  recommendations: {
    verdict: ReportVerdict
    reasoning: string
    next_steps: string[]
    feature_ideas?: Array<{
      pain_addressed: string
      feature_name: string
      how_it_works: string
      why_it_wins: string
    }>
    opportunity_reasoning?: string | null
    opportunity_size?: ReportOpportunitySize | null
  }
  pain_clusters: ReportPainCluster[]
  competitors: ReportCompetitor[]
  stats: ReportStats
  created_at: string
}

export interface Competitor {
  id: string
  project_id: string
  name: string
  description: string | null
  url: string
  category: string | null
  rating: number | null
  reviews_count: number | null
  source: 'g2' | 'capterra'
  created_at: string
}

export const STAGE_LABELS: Record<ResearchStage, string> = {
  queued: 'Starting',
  finding_competitors: 'Market map',
  collecting_reviews: 'Customer voices',
  analyzing: 'Pain patterns',
  generating_report: 'Your report',
  completed: 'Done',
  failed: 'Stopped',
  cancelled: 'Cancelled',
}

export const STAGE_DESCRIPTIONS: Record<ResearchStage, string> = {
  queued: 'Your analysis is about to begin.',
  finding_competitors: 'We are finding products that compete in your space.',
  collecting_reviews: 'We are reading what customers say about those products.',
  analyzing: 'We are grouping similar complaints into clear themes.',
  generating_report: 'We are turning the findings into a readable report.',
  completed: 'Your market research is ready.',
  failed: 'The analysis could not finish this time.',
  cancelled: 'You stopped this analysis.',
}
