import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, MessageSquare, Send, Shield, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseApiError } from '@/auth/parse-api-error'
import {
  listExternalChatRequest,
  listInternalChatRequest,
  postExternalChatRequest,
  postInternalChatRequest,
  markExternalChatReadRequest,
  markInternalChatReadRequest,
} from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { buildMentionSuggestions, extractActiveMentionQuery, mentionHints, resolveMentionsFromBody } from './chat-mentions'
import type { PaginatedData, ProjectChatMessage, ProjectMember } from '@/collab/collab.types'
import type { MeResponse } from '@/auth/auth.types'
import { getUserAvatarsRequest } from '@/media/media-api'
import { pickAvatarUrl } from '@/media/avatar-utils'

type Channel = 'external' | 'internal'

type Props = {
  accessToken: string
  projectId: string
  identity: MeResponse['data']
  isClient: boolean
  initialChannel?: Channel
  initialMessageId?: string
  members: ProjectMember[]
  onError: (msg: string) => void
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

const getAvatarColor = (sub: string | null): string => {
  if (!sub) return 'bg-slate-400'
  let hash = 0
  for (let i = 0; i < sub.length; i++) hash = (sub.charCodeAt(i) + ((hash << 5) - hash)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const getInitials = (msg: ProjectChatMessage): string => {
  const full = `${msg.authorFirstName ?? ''} ${msg.authorLastName ?? ''}`.trim()
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (!msg.authorEmail) return '?'
  return msg.authorEmail.slice(0, 2).toUpperCase()
}

const formatMessageTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })

const formatMessageDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  })

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const formatDaySeparator = (iso: string): string => {
  const date = new Date(iso)
  const today = startOfDay(new Date())
  const messageDay = startOfDay(date)
  const diffDays = Math.round((today.getTime() - messageDay.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function ChatPanel({ accessToken, projectId, identity, isClient, initialChannel, initialMessageId, members, onError }: Props) {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<Channel>(initialChannel ?? 'external')
  const [body, setBody] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMarkedRef = useRef<Record<Channel, string | null>>({ external: null, internal: null })
  const previousMessageCountRef = useRef<Record<Channel, number>>({ external: 0, internal: 0 })
  const initializedScrollRef = useRef<Record<Channel, boolean>>({ external: false, internal: false })
  const stickToBottomRef = useRef<Record<Channel, boolean>>({ external: true, internal: true })

  const externalQ = useQuery({
    queryKey: collabKeys.chatExternal(projectId),
    queryFn: () => listExternalChatRequest(accessToken, projectId),
    staleTime: 15_000,
  })
  const internalQ = useQuery({
    queryKey: collabKeys.chatInternal(projectId),
    queryFn: () => listInternalChatRequest(accessToken, projectId),
    enabled: !isClient,
    staleTime: 15_000,
  })
  const messages = channel === 'external' ? (externalQ.data?.data.items ?? []) : (internalQ.data?.data.items ?? [])
  const lastMessageId = messages[messages.length - 1]?.id ?? null
  const memberBySub = useMemo(() => new Map(members.map((member) => [member.userSub, member] as const)), [members])
  const avatarSubjects = useMemo(() => Array.from(new Set(members.map((m) => m.userSub))), [members])
  const avatarsQ = useQuery({
    queryKey: ['media', 'avatars', 'users', projectId, avatarSubjects.join(',')],
    queryFn: () => getUserAvatarsRequest(accessToken, avatarSubjects),
    enabled: avatarSubjects.length > 0,
    staleTime: 60_000,
  })
  const avatarBySub = avatarsQ.data?.data.items ?? {}

  const mentionQuery = useMemo(() => extractActiveMentionQuery(body, textareaRef.current?.selectionStart ?? body.length), [body])
  const mentionSuggestions = useMemo(() => mentionQuery ? buildMentionSuggestions(mentionQuery.query, identity.role, members) : [], [mentionQuery, identity.role, members])

  useLayoutEffect(() => {
    const container = logRef.current
    if (!container) return
    const previousCount = previousMessageCountRef.current[channel]
    const nextCount = messages.length
    const isInitialPaint = !initializedScrollRef.current[channel]
    const shouldStick = stickToBottomRef.current[channel]

    if (isInitialPaint) {
      container.scrollTop = container.scrollHeight
      initializedScrollRef.current[channel] = true
    } else if (nextCount > previousCount && shouldStick) {
      container.scrollTop = container.scrollHeight
    }

    previousMessageCountRef.current[channel] = nextCount
  }, [channel, messages.length])
  useEffect(() => {
    const container = logRef.current
    if (!container) return

    const updateStickState = () => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      stickToBottomRef.current[channel] = distanceToBottom < 56
    }

    updateStickState()
    container.addEventListener('scroll', updateStickState, { passive: true })
    const resizeObserver = new ResizeObserver(() => {
      if (stickToBottomRef.current[channel]) {
        container.scrollTop = container.scrollHeight
      }
    })
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', updateStickState)
      resizeObserver.disconnect()
    }
  }, [channel, messages.length])
  useEffect(() => { setActiveIdx(0) }, [mentionQuery?.query, mentionSuggestions.length])
  useEffect(() => { if (initialChannel) setChannel(initialChannel) }, [initialChannel])
  useEffect(() => { setHighlightMessageId(initialMessageId ?? null) }, [initialMessageId])

  useEffect(() => {
    if (!highlightMessageId || messages.length === 0) return
    const node = logRef.current?.querySelector<HTMLElement>(`[data-message-id="${highlightMessageId}"]`)
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(() => setHighlightMessageId((current) => (current === highlightMessageId ? null : current)), 2200)
    return () => window.clearTimeout(timer)
  }, [highlightMessageId, messages])

  useEffect(() => {
    if (!lastMessageId) return
    if (lastMarkedRef.current[channel] === lastMessageId) return
    lastMarkedRef.current[channel] = lastMessageId
    const req = channel === 'external' ? markExternalChatReadRequest : markInternalChatReadRequest
    void req(accessToken, projectId, { up_to_message_id: lastMessageId })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: collabKeys.mentionNotifications() })
        void queryClient.invalidateQueries({ queryKey: collabKeys.mentionNotificationsCount() })
      })
      .catch(() => undefined)
  }, [accessToken, projectId, channel, lastMessageId, queryClient])

  const getDisplayName = (msg: ProjectChatMessage): string => {
    const member = msg.authorSub ? memberBySub.get(msg.authorSub) : undefined
    const memberFullName = `${member?.first_name ?? ''} ${member?.last_name ?? ''}`.trim()
    const full = `${msg.authorFirstName ?? ''} ${msg.authorLastName ?? ''}`.trim()
    return memberFullName || full || member?.email || msg.authorEmail || 'Sistema'
  }

  const getAuthorTag = (msg: ProjectChatMessage): string => {
    const member = msg.authorSub ? memberBySub.get(msg.authorSub) : undefined
    const profession = member?.profession ?? msg.authorProfession
    const role = member?.role ?? msg.authorRole
    if (role === 'worker' && profession) return `Worker · ${profession}`
    if (role === 'worker') return 'Worker'
    if (role === 'admin') return 'Administrador'
    if (role === 'client') return 'Cliente'
    return 'Sistema'
  }

  const applyMention = (value: string) => {
    const caret = textareaRef.current?.selectionStart ?? body.length
    const info = extractActiveMentionQuery(body, caret)
    if (!info) return
    const before = body.slice(0, info.start)
    const after = body.slice(caret)
    const next = `${before}@${value} ${after}`
    setBody(next)
    requestAnimationFrame(() => {
      const pos = before.length + value.length + 2
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(pos, pos)
    })
  }

  const queryKey = channel === 'external' ? collabKeys.chatExternal(projectId) : collabKeys.chatInternal(projectId)
  const postMessageRequest = channel === 'external' ? postExternalChatRequest : postInternalChatRequest

  const send = useMutation({
    mutationFn: async ({
      trimmedBody,
      mentions,
    }: {
      trimmedBody: string
      mentions: string[]
    }) => {
      return postMessageRequest(accessToken, projectId, { body: trimmedBody, mentions })
    },
    onMutate: async ({ trimmedBody, mentions }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<{ data: PaginatedData<ProjectChatMessage> }>(queryKey)
      const optimisticId = `temp-${channel}-${Date.now()}`
      const optimisticMessage: ProjectChatMessage = {
        id: optimisticId,
        projectId,
        channel,
        messageType: 'text',
        authorSub: identity.id,
        authorEmail: identity.email ?? null,
        authorFirstName: identity.first_name ?? null,
        authorLastName: identity.last_name ?? null,
        authorRole: identity.role ?? null,
        authorProfession: identity.profession ?? null,
        body: trimmedBody,
        mentionedSubs: mentions.length > 0 ? mentions : null,
        metadata: null,
        createdAt: new Date().toISOString(),
        readStatus: {
          isSeen: false,
          requiredCount: 0,
          seenCount: 0,
        },
      }

      queryClient.setQueryData(queryKey, (current: { data: PaginatedData<ProjectChatMessage> } | undefined) => ({
        data: current?.data
          ? { ...current.data, items: [...current.data.items, optimisticMessage] }
          : { items: [optimisticMessage], page: 1, limit: 100, total: 1, total_pages: 1 },
      }))
      setBody('')

      return {
        previous,
        optimisticId,
        trimmedBody,
      }
    },
    onSuccess: (res, _variables, context) => {
      queryClient.setQueryData(queryKey, (current: { data: PaginatedData<ProjectChatMessage> } | undefined) => ({
        data: current?.data
          ? { ...current.data, items: current.data.items.map((message) => (message.id === context?.optimisticId ? res.data.data : message)) }
          : current?.data,
      }))
    },
    onError: async (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      if (context?.trimmedBody) {
        setBody(context.trimmedBody)
      }
      const message = await parseApiError(error)
      onError(message || 'No se pudo enviar el mensaje')
    },
  })

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden" style={{ height: 'min(600px, 70vh)' }} role="region" aria-label={channel === 'external' ? 'Chat con el cliente' : 'Chat interno del equipo'}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/20 shrink-0">
        <div>
          <p className="text-sm font-semibold">{channel === 'external' ? 'Chat con el Cliente' : 'Chat del Equipo'}</p>
          <p className="text-xs text-muted-foreground">{channel === 'external' ? 'Canal compartido con el cliente' : <span className="flex items-center gap-1"><Shield className="size-3 inline" /> Canal privado del equipo</span>}</p>
        </div>
        {!isClient && (
          <div className="flex gap-1 bg-background rounded-lg border p-0.5" role="tablist" aria-label="Seleccionar canal">
            {(['external', 'internal'] as const).map((ch) => (
              <button key={ch} role="tab" aria-selected={channel === ch} onClick={() => setChannel(ch)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${channel === ch ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {ch === 'external' ? <><Users className="size-3" aria-hidden="true" />Cliente</> : <><User className="size-3" aria-hidden="true" />Equipo</>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1" role="log" aria-live="polite" aria-label="Mensajes">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="size-10 opacity-20" aria-hidden="true" />
            <p className="text-sm">Aun no hay mensajes en este canal.</p>
          </div>
        ) : messages.map((msg, i) => {
          const isOwn = msg.authorSub === identity.id
          const isSystem = msg.messageType !== 'text'
          const isMentionedToCurrentUser = Array.isArray(msg.mentionedSubs) && msg.mentionedSubs.includes(identity.id)
          const prev = i > 0 ? messages[i - 1] : null
          const next = i < messages.length - 1 ? messages[i + 1] : null
          const showDaySeparator = !prev || !isSameDay(new Date(prev.createdAt), new Date(msg.createdAt))
          const sameAuthorAsPrev =
            !!prev &&
            prev.messageType === msg.messageType &&
            prev.authorSub === msg.authorSub &&
            prev.authorEmail === msg.authorEmail &&
            isSameDay(new Date(prev.createdAt), new Date(msg.createdAt))
          const sameAuthorAsNext =
            !!next &&
            next.messageType === msg.messageType &&
            next.authorSub === msg.authorSub &&
            next.authorEmail === msg.authorEmail &&
            isSameDay(new Date(next.createdAt), new Date(msg.createdAt))

          if (isSystem) return <div key={msg.id} className="flex justify-center py-1.5"><span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-[10px] text-muted-foreground"><MessageSquare className="size-3 shrink-0" />{msg.body}<span className="opacity-60">{formatMessageTime(msg.createdAt)}</span></span></div>
          return (
            <div key={msg.id}>
              {showDaySeparator && (
                <div className="my-2 flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                    {formatDaySeparator(msg.createdAt)}
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>
              )}
              <div
                data-message-id={msg.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${sameAuthorAsNext ? 'mb-0.5' : 'mb-2.5'} ${highlightMessageId === msg.id ? 'rounded-lg bg-amber-100/60 px-1 py-1 dark:bg-amber-300/15' : ''}`}
              >
                {!isOwn && (
                  <div className="flex w-7 shrink-0 items-end">
                    {!sameAuthorAsNext && (
                      <div className={`size-7 rounded-full flex items-center justify-center overflow-hidden text-white text-[10px] font-bold select-none ${getAvatarColor(msg.authorSub)}`} title={msg.authorEmail ?? undefined}>
                        {msg.authorSub && pickAvatarUrl(avatarBySub[msg.authorSub]?.urls, '64') ? (
                          <img src={pickAvatarUrl(avatarBySub[msg.authorSub]?.urls, '64')!} alt={`Avatar de ${getDisplayName(msg)}`} className="size-7 object-cover" />
                        ) : (
                          getInitials(msg)
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'} ${sameAuthorAsPrev ? 'pt-0' : 'pt-0.5'}`}>
                  {!isOwn && !sameAuthorAsPrev && (
                    <span className="mb-0.5 px-3 text-[11px] font-semibold text-muted-foreground">
                      {getDisplayName(msg)} · {getAuthorTag(msg)}
                      {isMentionedToCurrentUser && (
                        <span className="ml-2 inline-flex items-center rounded-full border border-amber-300/70 bg-amber-100/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          Te menciono
                        </span>
                      )}
                    </span>
                  )}
                  <div
                    className={`px-3.5 py-1.5 shadow-sm text-sm leading-relaxed break-words ${
                      isOwn
                        ? sameAuthorAsPrev
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                          : 'bg-primary text-primary-foreground rounded-t-2xl rounded-bl-2xl rounded-br-sm'
                        : sameAuthorAsPrev
                          ? 'bg-muted rounded-2xl rounded-bl-sm'
                          : 'bg-muted rounded-t-2xl rounded-br-2xl rounded-bl-sm'
                    } ${isMentionedToCurrentUser && !isOwn ? 'ring-1 ring-amber-300/70 bg-amber-50' : ''}`}
                  >
                    {msg.body}
                  </div>
                  {!sameAuthorAsNext && (
                    <span className="mt-0.5 inline-flex items-center gap-1 px-1 text-[10px] text-muted-foreground" title={formatMessageDateTime(msg.createdAt)}>
                      {formatMessageTime(msg.createdAt)}
                      {isOwn && (
                        msg.readStatus?.isSeen
                          ? <CheckCheck className="size-3 text-sky-500" />
                          : <Check className="size-3 text-muted-foreground" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <div className="border-t bg-background/80 p-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={`Escribe un mensaje ${channel === 'internal' ? 'al equipo' : 'al cliente'}... Usa @ para mencionar`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (mentionSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % mentionSuggestions.length); return }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length); return }
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                    e.preventDefault()
                    applyMention(mentionSuggestions[activeIdx]?.value ?? mentionSuggestions[0].value)
                    return
                  }
                  if (e.key === 'Escape') { e.preventDefault(); setBody((v) => `${v} `); return }
                }
                if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
                  e.preventDefault()
                  const trimmedBody = body.trim()
                  send.mutate({
                    trimmedBody,
                    mentions: resolveMentionsFromBody(trimmedBody, identity.role, members),
                  })
                }
              }}
              className="min-h-[44px] max-h-28 resize-none text-sm"
              rows={1}
              aria-label="Escribir mensaje"
            />
          </div>
          <Button
            size="icon"
            className="h-[44px] w-[44px] shrink-0 rounded-lg"
            disabled={body.trim().length < 1 || send.isPending}
            onClick={() => {
              const trimmedBody = body.trim()
              send.mutate({
                trimmedBody,
                mentions: resolveMentionsFromBody(trimmedBody, identity.role, members),
              })
            }}
            aria-label="Enviar mensaje"
          >
            <Send className="size-4" />
          </Button>
        </div>
        {mentionSuggestions.length > 0 && (
          <div className="mt-1 rounded-md border bg-popover p-1 shadow-sm max-h-40 overflow-y-auto">
            {mentionSuggestions.map((s, idx) => (
              <button
                key={s.key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyMention(s.value) }}
                className={`w-full rounded px-2 py-1 text-left text-xs ${idx === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
              >
                @{s.value} <span className="text-muted-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">Menciones permitidas: {mentionHints(identity.role).join(' · ')}</p>
      </div>
    </div>
  )
}
