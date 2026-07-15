import { apiFetch } from '@/lib/api/client'
import type { ResearchReport } from '@/lib/api/types'
import type { ShareDraft } from '@/lib/share-report'

export function getProjectReport(projectId: string) {
  return apiFetch<ResearchReport>(`/api/v1/projects/${projectId}/report`)
}

export function generateReportShareDraft(projectId: string, entitlementId: string) {
  return apiFetch<ShareDraft>(`/api/v1/projects/${projectId}/report/share-draft`, {
    method: 'POST',
    body: JSON.stringify({ entitlement_id: entitlementId }),
    cache: 'no-store',
  })
}
