import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { isHTTPError } from 'ky'
import {
  BarChart3,
  KanbanSquare,
  ShieldCheck,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/templates/app-shell'
import { DashboardOverview } from '@/components/organisms/dashboard-overview'
import { AccountPanel } from '@/components/organisms/account-panel'
import { AdminConsole } from '@/components/organisms/admin-console'
import { CollabPanel } from '@/components/organisms/collab-panel'
import { useSessionStore } from '@/auth/session-store'
import { logoutRequest } from '@/auth/auth-api'
import { fetchDashboardBff } from '@/bff/bff-api'
import { bffKeys } from '@/bff/query-keys'

type DashboardTab = 'overview' | 'collab' | 'account' | 'admin'

type DashboardSearch = {
  tab?: DashboardTab
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const token = useSessionStore.getState().token
    if (!token) {
      throw redirect({ to: '/login' })
    }
  },
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    const tab = search.tab
    return {
      tab:
        tab === 'overview' || tab === 'collab' || tab === 'account' || tab === 'admin'
          ? tab
          : undefined,
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { tab } = Route.useSearch()
  const token = useSessionStore((s) => s.token)
  const emailStored = useSessionStore((s) => s.email)
  const clearSession = useSessionStore((s) => s.clearSession)
  const navigate = useNavigate({ from: '/dashboard' })
  const queryClient = useQueryClient()

  // BFF: identidad + proyectos en una sola llamada al gateway
  const dashboardQuery = useQuery({
    queryKey: [...bffKeys.dashboard(), token],
    queryFn: () => fetchDashboardBff(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const isUnauthorized =
    dashboardQuery.isError &&
    isHTTPError(dashboardQuery.error) &&
    dashboardQuery.error.response.status === 401

  useEffect(() => {
    const err = dashboardQuery.error
    if (!err || !isHTTPError(err)) return
    if (err.response.status === 401) {
      clearSession()
      queryClient.clear()
      navigate({ to: '/login' })
    }
  }, [dashboardQuery.error, clearSession, navigate, queryClient])

  useEffect(() => {
    if (tab === 'admin' && dashboardQuery.data?.identity.role !== 'admin') {
      navigate({
        to: '/dashboard',
        search: (prev) => ({ ...prev, tab: 'overview' }),
        replace: true,
      })
    }
  }, [tab, dashboardQuery.data, navigate])

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const t = useSessionStore.getState().token
      if (!t) return
      try {
        await logoutRequest(t)
      } catch {
        /* cerrar sesion local igualmente */
      }
    },
    onSettled: () => {
      clearSession()
      queryClient.clear()
      navigate({ to: '/login' })
    },
  })

  const goTo = (next: DashboardTab) =>
    navigate({
      to: '/dashboard',
      search: (prev) => ({ ...prev, tab: next }),
      replace: true,
    })

  // ── Estados de carga / error antes de tener identity ──
  if (isUnauthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesion…</p>
      </div>
    )
  }

  if (dashboardQuery.isPending || !token) {
    return (
      <div
        className="flex items-center justify-center min-h-screen px-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <p className="text-sm text-muted-foreground text-center">Comprobando sesion…</p>
        </div>
      </div>
    )
  }

  if (dashboardQuery.isError && !isHTTPError(dashboardQuery.error)) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar tu perfil</AlertTitle>
            <AlertDescription>Ocurrio un error inesperado al validar tu sesion.</AlertDescription>
          </Alert>
          <Button variant="outline" className="w-full" onClick={() => dashboardQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const { identity, projects } = dashboardQuery.data!
  const isAdmin   = identity.role === 'admin'
  const activeTab: DashboardTab = (() => {
    const t = tab ?? 'overview'
    if (t === 'admin' && !isAdmin) return 'overview'
    return t
  })()

  const sidebarItems = [
    {
      key:      'overview',
      label:    'Resumen',
      icon:     <BarChart3 className="size-4" />,
      onClick:  () => goTo('overview'),
      isActive: activeTab === 'overview',
    },
    {
      key:      'collab',
      label:    'Colaboracion',
      icon:     <KanbanSquare className="size-4" />,
      onClick:  () => goTo('collab'),
      isActive: activeTab === 'collab',
    },
    {
      key:      'account',
      label:    'Mi Cuenta',
      icon:     <User className="size-4" />,
      onClick:  () => goTo('account'),
      isActive: activeTab === 'account',
    },
    {
      key:      'admin',
      label:    'Administracion',
      icon:     <ShieldCheck className="size-4" />,
      onClick:  () => goTo('admin'),
      isActive: activeTab === 'admin',
      hidden:   !isAdmin,
    },
  ]

  return (
    <AppShell
      title="CRM CIMA"
      sidebarItems={sidebarItems}
      userEmail={identity.email ?? emailStored ?? ''}
      userRole={identity.role}
      onLogout={() => logoutMutation.mutate()}
      isLoggingOut={logoutMutation.isPending}
    >
      {activeTab === 'overview' && (
        <DashboardOverview identity={identity} />
      )}

      {activeTab === 'collab' && (
        <CollabPanel
          accessToken={token}
          identity={identity}
          initialProjects={projects?.data}
        />
      )}

      {activeTab === 'account' && (
        <AccountPanel accessToken={token} identity={identity} />
      )}

      {activeTab === 'admin' && isAdmin && (
        <AdminConsole accessToken={token} />
      )}

      <p className="mt-12 text-center text-xs text-muted-foreground">
        ¿Problemas de acceso?{' '}
        <Link
          to="/forgot-password"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Recuperar contrasena
        </Link>
      </p>
    </AppShell>
  )
}
