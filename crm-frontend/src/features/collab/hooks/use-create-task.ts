import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/shared/lib'
import { createTaskRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { ProjectMember, ProjectTask, ProjectTaskColumn } from '@/features/collab/model'

type Subtask = { id: string; title: string; is_completed: boolean; assignee_sub: string | null }

type Params = {
  accessToken: string
  projectId: string
  column: ProjectTaskColumn | null
  tasksByColumn: Record<string, ProjectTask[]>
  members: ProjectMember[]
  selectedWorkerSubs: string[]
  title: string
  description: string
  priority: ProjectTask['priority']
  deadline: string
  clientVis: boolean
  subtasks: Subtask[]
  onCreated: () => void
  onError: (msg: string) => void
  handleClose: () => void
}

export function useCreateTask({
  accessToken,
  projectId,
  column,
  tasksByColumn,
  members,
  selectedWorkerSubs,
  title,
  description,
  priority,
  deadline,
  clientVis,
  subtasks,
  onCreated,
  onError,
  handleClose,
}: Params) {
  const queryClient = useQueryClient()
  const workerMembers = members.filter((m) => m.role === 'worker' && Boolean(m.email))
  const selectedWorkers = workerMembers.filter((m) => selectedWorkerSubs.includes(m.userSub))
  const columnId = column?.id ?? ''

  const createTask = useMutation({
    mutationFn: () =>
      createTaskRequest(accessToken, projectId, {
        column_id: columnId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignees: selectedWorkers.map((w) => ({ user_sub: w.userSub, user_email: w.email! })),
        due_date: deadline || undefined,
        client_visible: clientVis,
        checklist_progress: 0,
        position: (tasksByColumn[columnId] ?? []).length,
        subtasks,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
      void queryClient.invalidateQueries({ queryKey: collabKeys.timeline(projectId) })
      handleClose()
      onCreated()
    },
    onError: (error) => {
      void parseApiError(error).then((m) => onError(m || 'No se pudo crear la tarea'))
    },
  })

  return { createTask, workerMembers, selectedWorkers, columnId }
}




