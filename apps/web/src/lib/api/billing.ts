import { apiFetch } from '@/lib/api/client'
import type { CreditsBalance, Project, ResearchDepth, ResearchPack, ResearchPackInfo } from '@/lib/api/types'

export function getCredits() {
  return apiFetch<CreditsBalance>('/api/v1/billing/credits')
}

/** @deprecated use getCredits */
export const getBillingUsage = getCredits

export function getResearchPacks() {
  return apiFetch<ResearchPackInfo[]>('/api/v1/billing/packs')
}

export function createCheckoutSession(pack: ResearchPack) {
  return apiFetch<{ checkout_url: string; session_id: string }>('/api/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ pack }),
  })
}

export async function startPackCheckout(pack: ResearchPack): Promise<void> {
  const { checkout_url } = await createCheckoutSession(pack)
  window.location.href = checkout_url
}

export function fulfillCheckoutSession(sessionId: string) {
  return apiFetch<{
    fulfilled: boolean
    already_fulfilled: boolean
    pack: ResearchPack | null
    credits_added: number
    total_credits: number
  }>('/api/v1/billing/fulfill', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  })
}

export function unlockProject(projectId: string, researchDepth: ResearchDepth = 'shallow') {
  return apiFetch<Project>(`/api/v1/projects/${projectId}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ research_depth: researchDepth }),
  })
}
