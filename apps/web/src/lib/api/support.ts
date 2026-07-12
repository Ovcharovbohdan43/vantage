import { apiFetch } from '@/lib/api/client'

export function submitSupportRequest(payload: { message: string; subject?: string }) {
  return apiFetch<{ ok: boolean }>('/api/v1/support', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
