import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { isHTTPError } from 'ky'
import { BarChart3, KanbanSquare, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/templates/app-shell'
import { useSessionStore } from '@/app/session/session-store'
import { logoutRequest } from '@/features/auth/api'
import { AccountPanel } from '@/features/auth/ui'
import { AdminConsole } from '@/features/admin/ui'
import { fetchDashboardBff } from '@/features/bff/api'
import { bffKeys } from '@/features/bff/model'
import { DashboardOverview } from '@/features/bff/ui'
import { CollabPanel, NotificationsPanel } from '@/features/collab/ui'
import { getCurrentAvatarRequest } from '@/features/media/api'
import { pickAvatarUrl } from '@/features/media/utils'
import type { DashboardTab } from '@/routes/-dashboard.search'

type Props = {
  tab?: DashboardTab
  project_id?: string
  workspace_tab?: 'board' | 'chat' | 'brief' | 'members'
  chat_channel?: 'internal' | 'external'
  chat_message_id?: string
}

export function DashboardPage({ tab, project_id, workspace_tab, chat_channel, chat_message_id }: Props) {
  const token = useSessionStore((s) => s.token)
  const bootstrapped = useSessionStore((s) => s.bootstrapped)
  const emailStored = useSessionStore((s) => s.email)
  const clearSession = useSessionStore((s) => s.clearSession)
  const navigate = useNavigate({ from: '/dashboard' })
  const queryClient = useQueryClient()

  const dashboardQuery = useQuery({
    queryKey: [...bffKeys.dashboard(), token],
    queryFn: () => fetchDashboardBff(token!),
    enabled: bootstrapped && Boolean(token),
    retry: false,
  })
  const avatarQuery = useQuery({
    queryKey: ['media', 'avatar', 'current', token],
    queryFn: () => getCurrentAvatarRequest(token!),
    enabled: bootstrapped && Boolean(token),
    retry: false,
  })

  const isUnauthorized = dashboardQuery.isError && isHTTPError(dashboardQuery.error) && dashboardQuery.error.response.status === 401

  useEffect(() => {
    if (!bootstrapped || token) return
    navigate({ to: '/login', replace: true })
  }, [bootstrapped, token, navigate])

  useEffect(() => {
    const err = dashboardQuery.error
    if (!err || !isHTTPError(err)) return
    if (err.response.status === 401) {
      clearSession()
      queryClient.clear()
      navigate({ to: '/login', replace: true })
    }
  }, [dashboardQuery.error, clearSession, navigate, queryClient])

  useEffect(() => {
    if (tab === 'admin' && dashboardQuery.data?.identity?.role !== 'admin') {
      navigate({ to: '/dashboard', search: (prev) => ({ ...prev, tab: 'overview' }), replace: true })
    }
  }, [tab, dashboardQuery.data, navigate])

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const currentToken = useSessionStore.getState().token
      if (!currentToken) return
      try {
        await logoutRequest(currentToken)
      } catch {
        // ignore server logout failures when clearing local session
      }
    },
    onSettled: () => {
      clearSession()
      queryClient.clear()
      navigate({ to: '/login', replace: true })
    },
  })

  const goTo = (next: 'overview' | 'collab' | 'account' | 'notifications' | 'admin') =>
    navigate({
      to: '/dashboard',
      search: (prev) => ({
        ...prev,
        tab: next,
        ...(next === 'collab'
          ? {}
          : {
              project_id: undefined,
              workspace_tab: undefined,
              chat_channel: undefined,
              chat_message_id: undefined,
            }),
      }),
      replace: true,
    })

  const goToMention = (payload: { projectId: string; channel: 'internal' | 'external' | 'system'; messageId: string }) => {
    navigate({
      to: '/dashboard',
      search: (prev) => ({
        ...prev,
        tab: 'collab',
        project_id: payload.projectId,
        workspace_tab: 'chat',
        chat_channel: payload.channel === 'internal' ? 'internal' : 'external',
        chat_message_id: payload.messageId,
      }),
      replace: true,
    })
  }

  if (isUnauthorized) return <div className="flex items-center justify-center min-h-screen px-4"><p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesion...</p></div>

  if (!bootstrapped || dashboardQuery.isPending || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4" role="status" aria-live="polite" aria-busy="true">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <p className="text-sm text-muted-foreground text-center">Comprobando sesion...</p>
        </div>
      </div>
    )
  }

  if (dashboardQuery.isError && !isHTTPError(dashboardQuery.error)) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="destructive"><AlertTitle>No se pudo cargar tu perfil</AlertTitle><AlertDescription>Ocurrio un error inesperado al validar tu sesion.</AlertDescription></Alert>
          <Button variant="outline" className="w-full" onClick={() => dashboardQuery.refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const identity = dashboardQuery.data?.identity
  const projects = dashboardQuery.data?.projects

  if (!identity) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="destructive"><AlertTitle>No se pudo cargar tu identidad</AlertTitle><AlertDescription>La sesion no trajo informacion de usuario. Reintenta o vuelve a iniciar sesion.</AlertDescription></Alert>
          <Button variant="outline" className="w-full" onClick={() => dashboardQuery.refetch()}>Reintentar</Button>
          <Button className="w-full" onClick={() => { clearSession(); queryClient.clear(); navigate({ to: '/login', replace: true }) }}>Ir al login</Button>
        </div>
      </div>
    )
  }

  const isAdmin = identity.role === 'admin'
  const activeTab: DashboardTab = (() => {
    const currentTab = tab ?? 'overview'
    if (currentTab === 'admin' && !isAdmin) return 'overview'
    return currentTab
  })()

  const sidebarItems = [
    { key: 'overview', label: 'Resumen', icon: <BarChart3 className="size-4" />, onClick: () => goTo('overview'), isActive: activeTab === 'overview' },
    { key: 'collab', label: 'Colaboracion', icon: <KanbanSquare className="size-4" />, onClick: () => goTo('collab'), isActive: activeTab === 'collab' },
    { key: 'admin', label: 'Administracion', icon: <ShieldCheck className="size-4" />, onClick: () => goTo('admin'), isActive: activeTab === 'admin', hidden: !isAdmin },
  ]

  return (
    <AppShell
      title="CRM CIMA"
      sidebarItems={sidebarItems}
      userEmail={identity.email ?? emailStored ?? ''}
      userRole={identity.role}
      userAvatarUrl={pickAvatarUrl(avatarQuery.data?.data.urls, '64')}
      onOpenProfile={() => goTo('account')}
      onOpenNotifications={() => goTo('notifications')}
      onLogout={() => logoutMutation.mutate()}
      isLoggingOut={logoutMutation.isPending}
    >
      {activeTab === 'overview' && <DashboardOverview identity={identity} />}
      {activeTab === 'collab' && <CollabPanel accessToken={token} identity={identity} initialProjects={projects?.data} initialOpenProjectId={project_id} initialWorkspaceTab={workspace_tab} initialOpenChannel={chat_channel} initialOpenMessageId={chat_message_id} />}
      {activeTab === 'account' && <AccountPanel accessToken={token} identity={identity} />}
      {activeTab === 'notifications' && <NotificationsPanel accessToken={token} onOpenNotification={goToMention} />}
      {activeTab === 'admin' && isAdmin && <AdminConsole accessToken={token} />}
    </AppShell>
  )
}


