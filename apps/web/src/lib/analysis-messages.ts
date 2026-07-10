import type { ResearchStage } from '@/lib/api/types'

export type LoadingContext = ResearchStage | 'initial' | 'report'

export interface AnalysisLoadingCopy {
  title: string
  tips: string[]
}

export const ANALYSIS_LOADING_COPY: Record<LoadingContext, AnalysisLoadingCopy> = {
  initial: {
    title: 'Getting things ready',
    tips: [
      'Opening your research workspace.',
      'One moment while we catch up.',
    ],
  },
  report: {
    title: 'Preparing your report',
    tips: [
      'Pulling together the main findings.',
      'Organizing pain points and recommendations.',
      'Almost there — your report is on the way.',
    ],
  },
  queued: {
    title: 'Starting your analysis',
    tips: ['Your research is next in line.', 'We will begin in just a moment.'],
  },
  finding_competitors: {
    title: 'Mapping the market',
    tips: [
      'Looking for products that compete in your space.',
      'Building a shortlist of relevant alternatives.',
      'This helps us compare your idea against real players.',
    ],
  },
  collecting_reviews: {
    title: 'Reading customer feedback',
    tips: [
      'Gathering what people actually say about these products.',
      'Real reviews take a few minutes — this is the most valuable step.',
      'We focus on complaints and frustrations, not marketing copy.',
    ],
  },
  analyzing: {
    title: 'Finding patterns in complaints',
    tips: [
      'Grouping similar frustrations into clear themes.',
      'Spotting where users keep running into the same problems.',
      'Turning messy feedback into structured insights.',
    ],
  },
  generating_report: {
    title: 'Writing your report',
    tips: [
      'Summarizing opportunities and risks in plain language.',
      'Highlighting where a new product could stand out.',
      'Putting the final recommendations together.',
    ],
  },
  completed: {
    title: 'Analysis complete',
    tips: ['Your report is ready to open.'],
  },
  failed: {
    title: 'Something went wrong',
    tips: ['You can retry the analysis from this page.'],
  },
  cancelled: {
    title: 'Analysis cancelled',
    tips: ['You can start a new analysis with updated inputs whenever you are ready.'],
  },
}

export function getAnalysisLoadingCopy(stage: LoadingContext): AnalysisLoadingCopy {
  return ANALYSIS_LOADING_COPY[stage] ?? ANALYSIS_LOADING_COPY.initial
}
