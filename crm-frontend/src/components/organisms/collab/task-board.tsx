import { useState } from 'react'
import { KanbanSquare } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { TaskColumn } from './task-column'
import { TaskSheet } from './task-sheet'
import { CreateTaskModal } from './create-task-modal'
import type { ProjectMember, ProjectTask, ProjectTaskColumn } from '@/features/collab/model'
import type { MeResponse } from '@/shared/types'

type Props = {
  accessToken: string
  projectId: string
  columns: ProjectTaskColumn[]
  tasksByColumn: Record<string, ProjectTask[]>
  identity: MeResponse['data']
  members: ProjectMember[]
  canOperate: boolean
  isLoading: boolean
  onMoveTask: (taskId: string, targetColumnId: string) => void
  onTaskSaved: () => void
  onError: (msg: string) => void
  focusedTaskId?: string | null
}

/** Organismo: tablero kanban de tareas del proyecto (tablero hijo). */
export function TaskBoard({
  accessToken, projectId, columns, tasksByColumn, identity, members,
  canOperate, isLoading, onMoveTask, onTaskSaved, onError,
  focusedTaskId,
}: Props) {
  const [selectedTaskId,  setSelectedTaskId]  = useState<string | null>(focusedTaskId ?? null)
  const [createColumnId, setCreateColumnId] = useState<string | null>(null)

  const selectedTask = Object.values(tasksByColumn).flat().find(t => t.id === selectedTaskId) ?? null
  const createColumn = columns.find((column) => column.id === createColumnId) ?? null

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20" role="status" aria-label="Cargando tablero">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <CreateTaskModal
        accessToken={accessToken}
        projectId={projectId}
        column={createColumn}
        tasksByColumn={tasksByColumn}
        identity={identity}
        members={members}
        open={!!createColumn}
        onClose={() => setCreateColumnId(null)}
        onCreated={() => { setCreateColumnId(null); onTaskSaved() }}
        onError={onError}
      />

      <div
        role="region"
        aria-label={`Tablero de tareas con ${columns.length} columnas`}
        className="overflow-x-auto -mx-1 px-1 pb-2"
      >
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 gap-3 rounded-xl border border-dashed text-muted-foreground">
            <KanbanSquare className="size-10 opacity-20" aria-hidden="true" />
            <p>Sin columnas configuradas para este proyecto.</p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(195px, 1fr))`,
              minWidth: `calc(${columns.length} * (195px + 12px))`,
            }}
          >
            {columns.map((col) => (
              <TaskColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] ?? []}
                selectedTaskId={selectedTaskId}
                canDrag={canOperate}
                canCreateTask={canOperate}
                onSelectTask={(task) => setSelectedTaskId(task.id)}
                onDropTask={(taskId) => onMoveTask(taskId, col.id)}
                onCreateTask={() => setCreateColumnId(col.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null) }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
          {selectedTask && (
            <TaskSheet
              key={selectedTask.id}
              task={selectedTask}
              canEdit={canOperate}
              accessToken={accessToken}
              projectId={projectId}
              members={members}
              columns={columns}
              onClose={() => setSelectedTaskId(null)}
              onSaved={() => { setSelectedTaskId(null); onTaskSaved() }}
              onError={onError}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}



