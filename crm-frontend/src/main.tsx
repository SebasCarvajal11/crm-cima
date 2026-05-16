import { StrictMode } from 'react'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'

import { routeTree } from './routeTree.gen'
import { bindSessionStorageSync, bootstrapSession, useSessionStore } from './app/session/session-store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
})

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function AppBootstrap() {
  const bootstrapped = useSessionStore((s) => s.bootstrapped)

  useEffect(() => {
    bindSessionStorageSync()
    void bootstrapSession()
  }, [])

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">Restaurando sesion...</div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
    </QueryClientProvider>
  </StrictMode>,
)
