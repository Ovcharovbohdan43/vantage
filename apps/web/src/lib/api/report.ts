import { apiFetch } from '@/lib/api/client'
import type { ResearchReport } from '@/lib/api/types'

export function getProjectReport(projectId: string) {
  return apiFetch<ResearchReport>(`/api/v1/projects/${projectId}/report`)
}
