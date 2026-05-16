import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/shared/lib'
import { createTaskCommentRequest, listTaskCommentsRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { ProjectTaskComment } from '@/features/collab/model'

type Params = {
  accessToken: string
  projectId: string
  taskId: string
  content: string
  setContent: (value: string) => void
  onError: (msg: string) => void
}

export function useTaskComments({ accessToken, projectId, taskId, content, setContent, onError }: Params) {
  const queryClient = useQueryClient()

  const commentsQ = useQuery({
    queryKey: collabKeys.taskComments(taskId),
    queryFn: () => listTaskCommentsRequest(accessToken, projectId, taskId),
  })

  const comments = (commentsQ.data?.data ?? []) as ProjectTaskComment[]

  const send = useMutation({
    mutationFn: () => createTaskCommentRequest(accessToken, projectId, taskId, content.trim()),
    onSuccess: () => {
      setContent('')
      void queryClient.invalidateQueries({ queryKey: collabKeys.taskComments(taskId) })
    },
    onError: (error) => {
      void parseApiError(error).then((m) => onError(m || 'No se pudo enviar el comentario'))
    },
  })

  return { commentsQ, comments, send }
}




