import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { parseApiError } from '@/auth/parse-api-error'
import { createTaskCommentRequest, listTaskCommentsRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectTaskComment } from '@/collab/collab.types'

type Props = {
  accessToken: string
  projectId: string
  taskId: string
  onError: (msg: string) => void
}

/** Organismo: panel de comentarios de una tarea con feed y formulario de envio. */
export function TaskComments({ accessToken, projectId, taskId, onError }: Props) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const commentsQ = useQuery({
    queryKey: collabKeys.taskComments(taskId),
    queryFn:  () => listTaskCommentsRequest(accessToken, projectId, taskId),
  })
  const comments = (commentsQ.data?.data ?? []) as ProjectTaskComment[]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const send = useMutation({
    mutationFn: () => createTaskCommentRequest(accessToken, projectId, taskId, content.trim()),
    onSuccess: () => {
      setContent('')
      void queryClient.invalidateQueries({ queryKey: collabKeys.taskComments(taskId) })
    },
    onError: (e) => parseApiError(e).then((m) => onError(m || 'No se pudo enviar el comentario')),
  })

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px]" role="log" aria-live="polite">
        {commentsQ.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sin comentarios aun. Se el primero en comentar.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate">{c.authorEmail}</span>
                <time
                  dateTime={c.createdAt}
                  className="text-[10px] text-muted-foreground shrink-0"
                >
                  {new Date(c.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Escribe un comentario… (Ctrl+Enter para enviar)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none"
          aria-label="Escribe un comentario"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && content.trim()) {
              send.mutate()
            }
          }}
        />
        <Button size="sm" disabled={!content.trim() || send.isPending} onClick={() => send.mutate()}>
          <Send className="size-3.5 mr-1.5" />
          {send.isPending ? 'Enviando…' : 'Comentar'}
        </Button>
      </div>
    </div>
  )
}
