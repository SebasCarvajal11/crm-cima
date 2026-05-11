import ky from 'ky'
import { getApiBaseUrl, useSessionStore } from '@/auth/session-store'

type RefreshPayload = {
  data?: {
    access_token?: string
  }
}

let refreshInFlight: Promise<string> | null = null

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
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
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
      return token
    })()
      .catch((error) => {
        useSessionStore.getState().clearSession()
        throw error
      })
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

async function retryWithRefreshedToken(request: Request, token: string) {
  const headers = new Headers(request.headers)
  headers.set('authorization', `Bearer ${token}`)
  headers.set('x-auth-retried', '1')

  return api(request, { headers, credentials: 'include' })
}

/** Cliente HTTP hacia el API Gateway (KrakenD): rutas sin prefijo `/api`. */
export const api = ky.create({
  prefix: getApiBaseUrl(),
  credentials: 'include',
  timeout: 30_000,
  retry: { limit: 0 },
  hooks: {
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
