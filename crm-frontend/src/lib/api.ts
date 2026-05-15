import ky from 'ky'
import { getApiBaseUrl, useSessionStore } from '@/auth/session-store'

type RefreshPayload = {
  data?: {
    access_token?: string
  }
}

type Subscriber = {
  resolve: (token: string) => void
  reject: (error: Error) => void
}

let isRefreshing = false
let refreshSubscribers: Array<Subscriber> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token))
  refreshSubscribers = []
}

function onRefreshFailed(error: Error) {
  refreshSubscribers.forEach(({ reject }) => reject(error))
  refreshSubscribers = []
}

function hasRetriedAuth(request: Request): boolean {
  return request.headers.get('x-auth-retried') === '1'
}

function shouldAttemptRefresh(request: Request, response: Response): boolean {
  if (response.status !== 401) return false
  if (request.url.includes('/auth/refresh')) return false
  if (hasRetriedAuth(request)) return false
  return request.headers.has('authorization')
}

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshSubscribers.push({ resolve, reject })
    })
  }

  isRefreshing = true

  try {
    const refreshResponse = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!refreshResponse.ok) {
      throw new Error('No se pudo renovar la sesion')
    }

    const payload = (await refreshResponse.json()) as RefreshPayload
    const token = payload.data?.access_token
    if (!token) {
      throw new Error('La respuesta de refresh no trae access_token')
    }

    useSessionStore.getState().setSession(token, useSessionStore.getState().email)
    onRefreshed(token)
    return token
  } catch (error) {
    useSessionStore.getState().clearSession()
    onRefreshFailed(error as Error)
    throw error
  } finally {
    isRefreshing = false
  }
}

async function retryWithRefreshedToken(request: Request, token: string) {
  const headers = new Headers(request.headers)
  headers.set('authorization', `Bearer ${token}`)
  headers.set('x-auth-retried', '1')

  return api(request, { headers, credentials: 'include' })
}

function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null
  const [scheme, token] = headerValue.split(' ')
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token
}

/** Cliente HTTP hacia el API Gateway (KrakenD): rutas sin prefijo `/api`. */
export const api = ky.create({
  prefix: getApiBaseUrl(),
  credentials: 'include',
  timeout: 30_000,
  retry: { limit: 0 },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const authHeader = request.headers.get('authorization')
        const requestToken = extractBearerToken(authHeader)
        if (!requestToken) return

        const currentToken = useSessionStore.getState().token
        if (!currentToken || currentToken !== requestToken) {
          // Bloquea fugas: request autenticada con token viejo de otra sesion.
          throw new Error('Sesion invalida o token obsoleto para la solicitud actual')
        }
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        if (!shouldAttemptRefresh(request, response)) return response

        try {
          const token = await refreshAccessToken()
          return retryWithRefreshedToken(request, token)
        } catch {
          if (typeof window !== 'undefined') {
            window.location.assign('/login')
          }
          return response
        }
      },
    ],
  },
})
