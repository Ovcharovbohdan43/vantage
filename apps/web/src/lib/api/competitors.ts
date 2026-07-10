import { apiFetch } from '@/lib/api/client'
import type { Competitor } from '@/lib/api/types'

export function listCompetitors(projectId: string) {
  return apiFetch<{ items: Competitor[]; total: number }>(`/api/v1/projects/${projectId}/competitors`)
}

export function addCompetitor(projectId: string, payload: { name: string; url: string }) {
  return apiFetch<Competitor>(`/api/v1/projects/${projectId}/competitors`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
