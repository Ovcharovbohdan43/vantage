import { apiFetch } from '@/lib/api/client'

export type FeedbackTag =
  | 'report_useful'
  | 'waited_too_long'
  | 'bugs'
  | 'easy_to_use'
  | 'confusing'
  | 'would_recommend'

export function getFeedbackStatus() {
  return apiFetch<{ submitted: boolean }>('/api/v1/feedback/status')
}

export function submitFeedback(payload: {
  project_id?: string
  tags: FeedbackTag[]
  message?: string
}) {
  return apiFetch<{ id: string; submitted: boolean }>('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
