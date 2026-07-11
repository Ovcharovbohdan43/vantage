function getApiBase(): string {
  // Server components cannot use the Next.js rewrite proxy — hit the API directly.
  if (typeof window === 'undefined') {
    const configured =
      process.env.API_INTERNAL_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || ''
    if (configured) return configured.replace(/\/$/, '')
    // On Vercel, localhost makes Research Library silently empty (fetch fails → []).
    if (process.env.VERCEL) {
      console.error(
        '[publicApi] Set API_INTERNAL_URL or NEXT_PUBLIC_API_URL to the Railway API origin',
      )
    }
    return 'http://localhost:8000'
  }
  if (process.env.NEXT_PUBLIC_API_PROXY === '1') {
    return ''
  }
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
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

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
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
