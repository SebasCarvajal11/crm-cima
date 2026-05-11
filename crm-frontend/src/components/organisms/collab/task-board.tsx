import { useState } from 'react'
import { KanbanSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { TaskColumn } from './task-column'
import { TaskSheet } from './task-sheet'
import { CreateTaskModal } from './create-task-modal'
import type { ProjectMember, ProjectTask, ProjectTaskColumn } from '@/collab/collab.types'
import type { MeResponse } from '@/auth/auth.types'

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
}

/** Organismo: tablero kanban de tareas del proyecto (tablero hijo). */
export function TaskBoard({
  accessToken, projectId, columns, tasksByColumn, identity, members,
  canOperate, isLoading, onMoveTask, onTaskSaved, onError,
}: Props) {
  const [selectedTaskId,  setSelectedTaskId]  = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const selectedTask = Object.values(tasksByColumn).flat().find(t => t.id === selectedTaskId) ?? null

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20" role="status" aria-label="Cargando tablero">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {canOperate && columns.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="size-4 mr-1.5" />
            Nueva tarea
          </Button>
        </div>
      )}

      <CreateTaskModal
        accessToken={accessToken}
        projectId={projectId}
        columns={columns}
        tasksByColumn={tasksByColumn}
        identity={identity}
        members={members}
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); onTaskSaved() }}
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
              gridTemplateColumns: `repeat(${columns.length}, minmax(210px, 1fr))`,
              minWidth: `calc(${columns.length} * (210px + 12px))`,
            }}
          >
            {columns.map((col) => (
              <TaskColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] ?? []}
                selectedTaskId={selectedTaskId}
                canDrag={canOperate}
                onSelectTask={(task) => setSelectedTaskId(task.id)}
                onDropTask={(taskId) => onMoveTask(taskId, col.id)}
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
