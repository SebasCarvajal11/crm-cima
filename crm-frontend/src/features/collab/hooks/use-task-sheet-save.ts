import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/shared/lib'
import { patchTaskRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { ClientSearchResult } from '@/shared/types'
import type { ProjectTask } from '@/features/collab/model'

type SubtaskPayload = { id: string; title: string; is_completed: boolean; assignee_sub: string | null }[]

type Params = {
  accessToken: string
  projectId: string
  task: ProjectTask
  onSaved: () => void
  onError: (msg: string) => void
}

type SaveInput = {
  editTitle: string
  editDesc: string
  editPriority: ProjectTask['priority']
  editVisible: boolean
  editDeadline: string
  editColumnId: string
  editWorkers: ClientSearchResult[]
  subtasks?: SubtaskPayload
}

export function useTaskSheetSave({ accessToken, projectId, task, onSaved, onError }: Params) {
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: (input: SaveInput) =>
      patchTaskRequest(accessToken, task.id, {
        title: input.editTitle.trim(),
        description: input.editDesc.trim() || null,
        priority: input.editPriority,
        client_visible: input.editVisible,
        column_id: input.editColumnId !== task.columnId ? input.editColumnId : undefined,
        due_date: input.editDeadline || null,
        assignees: input.editWorkers.length > 0
          ? input.editWorkers.map((w) => ({ user_sub: w.subject, user_email: w.email }))
          : undefined,
        subtasks: input.subtasks,
      }),
    onSuccess: (_result, variables) => {
      if (variables.subtasks === undefined) {
        onSaved()
      } else {
        void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
        void queryClient.invalidateQueries({ queryKey: collabKeys.timeline(projectId) })
      }
    },
    onError: (error) => {
      void parseApiError(error).then((m) => onError(m || 'No se pudo guardar'))
    },
  })

  return { save }
}




