import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, RefreshCw } from 'lucide-react'
import {
  listUnreadMentionNotificationsRequest,
  markMentionNotificationSeenRequest,
} from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { Button } from '@/components/ui/button'

type Props = {
  accessToken: string
  onOpenNotification: (payload: { projectId: string; channel: 'internal' | 'external' | 'system'; messageId: string }) => void
}

const formatWhen = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
}

export function NotificationsPanel({ accessToken, onOpenNotification }: Props) {
  const queryClient = useQueryClient()

  const notificationsQ = useQuery({
    queryKey: collabKeys.mentionNotifications(),
    queryFn: () => listUnreadMentionNotificationsRequest(accessToken),
    refetchInterval: 20_000,
  })

  const markSeen = useMutation({
    mutationFn: (notificationId: string) => markMentionNotificationSeenRequest(accessToken, notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collabKeys.mentionNotifications() })
      void queryClient.invalidateQueries({ queryKey: collabKeys.mentionNotificationsCount() })
    },
  })

  const rows = notificationsQ.data?.data ?? []

  const handleOpen = async (item: (typeof rows)[number]) => {
    await markSeen.mutateAsync(item.id)
    onOpenNotification({ projectId: item.project_id, channel: item.channel, messageId: item.message_id })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notificaciones</h2>
          <p className="text-sm text-muted-foreground">Menciones sin leer en chats de proyecto.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => notificationsQ.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Actualizar
        </Button>
      </div>

      {notificationsQ.isLoading && <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>}
      {!notificationsQ.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No tienes menciones sin leer.</p>
      )}

      <div className="space-y-2">
        {rows.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => void handleOpen(n)}
            className="w-full rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
          >
            <p className="text-xs font-semibold text-primary">{n.project_name}</p>
            <p className="text-xs text-muted-foreground">{n.author_name} · {formatWhen(n.created_at)}</p>
            <p className="mt-1 text-sm line-clamp-2">{n.message_preview}</p>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="size-3" />
              {n.channel === 'internal' ? 'Chat interno' : 'Chat con cliente'}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}