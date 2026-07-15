import { apiFetch } from '@/lib/api/client'
import type { CreditsBalance, Project, ResearchDepth, ResearchPack, ResearchPackInfo } from '@/lib/api/types'
import type { ShareDraftSource } from '@/lib/share-report'

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

export function createShareDraftCheckout(source: ShareDraftSource) {
  const sourceKind =
    source.kind === 'idea-of-week' ? 'idea_of_week' : source.kind
  const sourceRef =
    source.kind === 'report' ? source.projectId : source.kind === 'library' ? source.slug : source.week
  return apiFetch<{
    entitlement_id: string
    checkout_url: string | null
    payment_required: boolean
    amount_cents: number
    currency: string
  }>('/api/v1/billing/share-drafts/checkout', {
    method: 'POST',
    body: JSON.stringify({ source_kind: sourceKind, source_ref: sourceRef }),
  })
}

export function fulfillShareDraftCheckout(sessionId: string) {
  return apiFetch<{
    entitlement_id: string
    source_kind: 'report' | 'library' | 'idea_of_week'
    source_ref: string
    return_path: string
    ready: boolean
  }>('/api/v1/billing/share-drafts/fulfill', {
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

export function redeemPromoCode(code: string) {
  return apiFetch<{
    code: string
    credits_granted: number
    total_credits: number
    already_redeemed: boolean
  }>('/api/v1/billing/promo/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export const PENDING_PROMO_KEY = 'vantage_pending_promo'

export function stashPendingPromo(code: string) {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return
  try {
    localStorage.setItem(PENDING_PROMO_KEY, normalized)
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPendingPromo(): string | null {
  try {
    return localStorage.getItem(PENDING_PROMO_KEY)
  } catch {
    return null
  }
}

export function clearPendingPromo() {
  try {
    localStorage.removeItem(PENDING_PROMO_KEY)
  } catch {
    /* ignore */
  }
}
