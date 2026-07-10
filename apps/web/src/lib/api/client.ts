import { createClient } from '@/lib/supabase/client'

// In local dev, `npm run dev` sets NEXT_PUBLIC_API_PROXY=1 and Next.js rewrites /api/v1/* to the API.
const API_URL =
  process.env.NEXT_PUBLIC_API_PROXY === '1'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new ApiError('Not authenticated', 401)
  }
  return data.session.access_token
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    })
  } catch {
    const target = API_URL || 'this app (via /api/v1 proxy)'
    throw new ApiError(`Cannot reach the API at ${target}. Is npm run dev running?`, 0)
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let code: string | undefined
    try {
      const body = await response.json()
      if (body.detail) {
        if (typeof body.detail === 'string') {
          message = body.detail
        } else if (typeof body.detail === 'object' && body.detail.message) {
          message = body.detail.message
          code = body.detail.code
        } else {
          message = JSON.stringify(body.detail)
        }
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
