import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Shield, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseApiError } from '@/auth/parse-api-error'
import {
  listExternalChatRequest,
  listInternalChatRequest,
  postExternalChatRequest,
  postInternalChatRequest,
} from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectChatMessage } from '@/collab/collab.types'
import type { MeResponse } from '@/auth/auth.types'

type Channel = 'external' | 'internal'

type Props = {
  accessToken: string
  projectId: string
  identity: MeResponse['data']
  isClient: boolean
  onError: (msg: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
]

function getAvatarColor(sub: string | null): string {
  if (!sub) return 'bg-slate-400'
  let hash = 0
  for (let i = 0; i < sub.length; i++) hash = (sub.charCodeAt(i) + ((hash << 5) - hash)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(email: string | null): string {
  if (!email) return '?'
  const name = email.split('@')[0]
  const parts = name.split(/[._\-+]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getDisplayName(email: string | null): string {
  if (!email) return 'Sistema'
  return email.split('@')[0]
}

/** Formatea timestamp de mensaje: hora si es hoy, fecha+hora si es otro día. */
function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  const now  = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth()    &&
    date.getDate()     === now.getDate()

  if (isToday) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const isThisYear = date.getFullYear() === now.getFullYear()
  const dateStr = date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    ...(isThisYear ? {} : { year: 'numeric' }),
  })
  const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${dateStr}, ${timeStr}`
}

/** Detecta si dos mensajes deben estar en el mismo bloque (mismo autor, <3 min de diferencia). */
function isSameBlock(a: ProjectChatMessage, b: ProjectChatMessage): boolean {
  if (a.authorSub !== b.authorSub) return false
  const diff = Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return diff < 3 * 60 * 1000 // 3 minutos
}

// ─── Componente ───────────────────────────────────────────────────────────────

/** Organismo: chat del proyecto (canal cliente + canal equipo interno). */
export function ChatPanel({ accessToken, projectId, identity, isClient, onError }: Props) {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<Channel>('external')
  const [body,    setBody]    = useState('')
  const bottomRef             = useRef<HTMLDivElement>(null)

  const externalQ = useQuery({
    queryKey: collabKeys.chatExternal(projectId),
    queryFn:  () => listExternalChatRequest(accessToken, projectId),
  })
  const internalQ = useQuery({
    queryKey: collabKeys.chatInternal(projectId),
    queryFn:  () => listInternalChatRequest(accessToken, projectId),
    enabled:  !isClient,
  })

  const messages = channel === 'external'
    ? (externalQ.data?.data ?? [])
    : (internalQ.data?.data ?? [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = useMutation({
    mutationFn: () =>
      channel === 'external'
        ? postExternalChatRequest(accessToken, projectId, { body })
        : postInternalChatRequest(accessToken, projectId, { body }),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({
        queryKey: channel === 'external'
          ? collabKeys.chatExternal(projectId)
          : collabKeys.chatInternal(projectId),
      })
    },
    onError: (e) => parseApiError(e).then((m) => onError(m || 'No se pudo enviar el mensaje')),
  })

  return (
    <div
      className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden"
      style={{ height: 'min(600px, 70vh)' }}
      role="region"
      aria-label={channel === 'external' ? 'Chat con el cliente' : 'Chat interno del equipo'}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/20 shrink-0">
        <div>
          <p className="text-sm font-semibold">
            {channel === 'external' ? 'Chat con el Cliente' : 'Chat del Equipo'}
          </p>
          <p className="text-xs text-muted-foreground">
            {channel === 'external'
              ? 'Canal compartido con el cliente'
              : <span className="flex items-center gap-1"><Shield className="size-3 inline" /> Canal privado del equipo</span>}
          </p>
        </div>
        {!isClient && (
          <div className="flex gap-1 bg-background rounded-lg border p-0.5" role="tablist" aria-label="Seleccionar canal">
            {(['external', 'internal'] as const).map((ch) => (
              <button key={ch} role="tab" aria-selected={channel === ch} onClick={() => setChannel(ch)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  channel === ch ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {ch === 'external'
                  ? <><Users className="size-3" aria-hidden="true" />Cliente</>
                  : <><User  className="size-3" aria-hidden="true" />Equipo</>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" role="log" aria-live="polite" aria-label="Mensajes">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="size-10 opacity-20" aria-hidden="true" />
            <p className="text-sm">Aún no hay mensajes en este canal.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn      = msg.authorSub === identity.id
            const isSystem   = msg.messageType !== 'text'
            const prevMsg    = i > 0 ? messages[i - 1] : null
            const nextMsg    = i < messages.length - 1 ? messages[i + 1] : null
            const isFirst    = !prevMsg || !isSameBlock(prevMsg, msg)
            const isLast     = !nextMsg || !isSameBlock(msg, nextMsg)
            const displayName = getDisplayName(msg.authorEmail)
            const initials    = getInitials(msg.authorEmail)
            const avatarColor = getAvatarColor(msg.authorSub)

            // System messages (change requests, milestones)
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 border rounded-full px-3 py-1">
                    <MessageSquare className="size-3 shrink-0" />
                    {msg.body}
                    <span className="opacity-60 ml-1">{formatMessageTime(msg.createdAt)}</span>
                  </span>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isLast ? 'mb-3' : 'mb-0.5'}`}
              >
                {/* Avatar — solo en el último mensaje del bloque y si no es propio */}
                {!isOwn && (
                  <div className={`shrink-0 size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold select-none ${avatarColor} ${isLast ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden={!isLast}
                    title={msg.authorEmail ?? undefined}
                  >
                    {initials}
                  </div>
                )}

                <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Nombre — solo en el primer mensaje del bloque y si no es propio */}
                  {!isOwn && isFirst && (
                    <span className="text-[11px] font-semibold text-muted-foreground px-3 mb-0.5">
                      {displayName}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={`px-3.5 py-2 shadow-sm text-sm leading-relaxed break-words ${
                      isOwn
                        ? `bg-primary text-primary-foreground ${isFirst ? 'rounded-t-2xl' : 'rounded-t-md'} rounded-bl-2xl rounded-br-sm`
                        : `bg-muted ${isFirst ? 'rounded-t-2xl' : 'rounded-t-md'} rounded-br-2xl rounded-bl-sm`
                    }`}
                  >
                    {msg.body}
                  </div>

                  {/* Timestamp — solo en el último del bloque */}
                  {isLast && (
                    <span className="text-[10px] text-muted-foreground px-1 mt-1">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t bg-background/80 shrink-0">
        <Textarea
          placeholder={`Escribe un mensaje ${channel === 'internal' ? 'al equipo' : 'al cliente'}… (Enter para enviar, Shift+Enter nueva línea)`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && body.trim()) { e.preventDefault(); send.mutate() }
          }}
          className="min-h-[44px] max-h-28 resize-none text-sm flex-1"
          rows={1}
          aria-label="Escribir mensaje"
        />
        <Button size="icon" className="shrink-0 self-end h-10 w-10"
          disabled={body.trim().length < 1 || send.isPending} onClick={() => send.mutate()} aria-label="Enviar mensaje">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
