import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, MessageSquare, X } from 'lucide-react'
import {
  listUnreadMentionNotificationsRequest,
  markMentionNotificationSeenRequest,
} from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'

type Props = {
  accessToken: string
  onOpenNotification: (payload: { projectId: string; channel: 'internal' | 'external' | 'system'; messageId: string }) => void
}

const formatWhen = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
}

export function MentionNotifications({ accessToken, onOpenNotification }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
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
  const unread = rows.length

  const handleOpen = async (item: (typeof rows)[number]) => {
    await markSeen.mutateAsync(item.id)
    onOpenNotification({ projectId: item.project_id, channel: item.channel, messageId: item.message_id })
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-muted"
        aria-label="Notificaciones de menciones"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-14 z-50 rounded-xl border bg-card text-foreground shadow-lg sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-[22rem] sm:max-w-[calc(100vw-1rem)]">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Mensajes por mencion</p>
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notificationsQ.isLoading && <p className="px-2 py-3 text-sm text-muted-foreground">Cargando...</p>}
            {!notificationsQ.isLoading && rows.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">No tienes menciones sin leer.</p>
            )}
            {rows.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleOpen(n)}
                className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-muted"
              >
                <p className="text-xs font-semibold text-primary">{n.project_name}</p>
                <p className="text-xs text-muted-foreground">{n.author_name} Â· {formatWhen(n.created_at)}</p>
                <p className="mt-1 text-sm line-clamp-2">{n.message_preview}</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MessageSquare className="size-3" />
                  {n.channel === 'internal' ? 'Chat interno' : 'Chat con cliente'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

