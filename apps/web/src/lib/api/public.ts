import { resolveApiOrigin } from '@/lib/api/origin'

function getApiBase(): string {
  return resolveApiOrigin()
}

const API_URL = getApiBase()

export class PublicApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'PublicApiError'
  }
}

export async function publicApiFetch<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T> {
  const { revalidate, ...fetchInit } = init ?? {}
  const isServer = typeof window === 'undefined'
  // Resolve per-request on the server so Vercel runtime env / fallbacks apply.
  const base = isServer ? resolveApiOrigin() : API_URL

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      ...fetchInit,
      headers: {
        'Content-Type': 'application/json',
        ...fetchInit?.headers,
      },
      ...(isServer && revalidate !== undefined ? { next: { revalidate } } : {}),
    })
  } catch {
    throw new PublicApiError('Cannot reach the API', 0)
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body.detail) message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {
      // ignore
    }
    throw new PublicApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
