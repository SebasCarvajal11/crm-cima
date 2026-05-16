import { create } from 'zustand'

const TOKEN_KEY = 'cima_access_token'
const EMAIL_KEY = 'cima_user_email'

type StoredSession = {
  token: string | null
  email: string | null
}

type SessionState = StoredSession & {
  bootstrapped: boolean
  setSession: (token: string, email?: string | null) => void
  clearSession: () => void
  setBootstrapped: (value: boolean) => void
  syncFromStorage: () => void
}

let bootstrapInFlight: Promise<void> | null = null
let storageSyncBound = false

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readStored(): StoredSession {
  if (!canUseStorage()) {
    return { token: null, email: null }
  }

  return {
    token: localStorage.getItem(TOKEN_KEY),
    email: localStorage.getItem(EMAIL_KEY),
  }
}

function writeStored(token: string | null, email: string | null) {
  if (!canUseStorage()) return

  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }

  if (email) {
    localStorage.setItem(EMAIL_KEY, email)
  } else {
    localStorage.removeItem(EMAIL_KEY)
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  ...readStored(),
  bootstrapped: false,
  setSession: (token, email = null) => {
    writeStored(token, email ?? null)
    set({ token, email: email ?? null })
  },
  clearSession: () => {
    writeStored(null, null)
    set({ token: null, email: null })
  },
  setBootstrapped: (value) => set({ bootstrapped: value }),
  syncFromStorage: () => set(readStored()),
}))

export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'
  return base.replace(/\/$/, '')
}

export async function bootstrapSession(): Promise<void> {
  if (bootstrapInFlight) return bootstrapInFlight

  bootstrapInFlight = (async () => {
    const store = useSessionStore.getState()
    store.syncFromStorage()

    if (useSessionStore.getState().token) {
      useSessionStore.getState().setBootstrapped(true)
      return
    }

    try {
      const refreshResponse = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!refreshResponse.ok) {
        useSessionStore.getState().clearSession()
        return
      }

      const payload = (await refreshResponse.json()) as {
        data?: { access_token?: string }
      }
      const token = payload.data?.access_token

      if (!token) {
        useSessionStore.getState().clearSession()
        return
      }

      useSessionStore.getState().setSession(token, useSessionStore.getState().email)
    } finally {
      useSessionStore.getState().setBootstrapped(true)
      bootstrapInFlight = null
    }
  })()

  return bootstrapInFlight
}

export function bindSessionStorageSync() {
  if (!canUseStorage() || storageSyncBound) return

  window.addEventListener('storage', (event) => {
    if (event.key !== TOKEN_KEY && event.key !== EMAIL_KEY && event.key !== null) return
    useSessionStore.getState().syncFromStorage()
  })

  storageSyncBound = true
}
