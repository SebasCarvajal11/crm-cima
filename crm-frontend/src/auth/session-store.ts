import { create } from 'zustand'

const TOKEN_KEY = 'cima_access_token'
const EMAIL_KEY = 'cima_user_email'

function readStored(): { token: string | null; email: string | null } {
  if (typeof sessionStorage === 'undefined') {
    return { token: null, email: null }
  }
  return {
    token: sessionStorage.getItem(TOKEN_KEY),
    email: sessionStorage.getItem(EMAIL_KEY),
  }
}

type SessionState = {
  token: string | null
  email: string | null
  setSession: (token: string, email?: string | null) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  ...readStored(),
  setSession: (token, email = null) => {
    sessionStorage.setItem(TOKEN_KEY, token)
    if (email) {
      sessionStorage.setItem(EMAIL_KEY, email)
    } else {
      sessionStorage.removeItem(EMAIL_KEY)
    }
    set({ token, email: email ?? null })
  },
  clearSession: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(EMAIL_KEY)
    set({ token: null, email: null })
  },
}))

export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'
  // En desarrollo Vite hace proxy de /api → KrakenD eliminando CORS.
  // En producción VITE_API_BASE_URL apunta a la URL completa del gateway.
  return base.replace(/\/$/, '')
}
