import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskCard } from './task-card'
import type { ProjectTask, ProjectTaskColumn } from '@/collab/collab.types'

/**
 * Alto fijo del area de tareas (en px).
 * Todas las columnas comparten este valor → aspecto uniforme independiente del contenido.
 * Cambiar solo aqui para ajustar globalmente.
 */
const COLUMN_BODY_HEIGHT = 520

type Props = {
  column: ProjectTaskColumn
  tasks: ProjectTask[]
  selectedTaskId: string | null
  canDrag: boolean
  canCreateTask: boolean
  onSelectTask: (t: ProjectTask) => void
  onDropTask: (taskId: string) => void
  onCreateTask: () => void
}

/** Organismo: columna kanban de tareas con alto fijo y soporte drag-and-drop. */
export function TaskColumn({ column, tasks, selectedTaskId, canDrag, canCreateTask, onSelectTask, onDropTask, onCreateTask }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <section
      aria-label={`Columna ${column.title}, ${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`}
      className={`flex flex-col rounded-xl border transition-colors duration-150 ${
        isDragOver ? 'border-primary bg-primary/5 shadow-md' : 'bg-muted/30 border-border'
      }`}
      onDragOver={(e) => { if (canDrag) { e.preventDefault(); setIsDragOver(true) } }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (!canDrag) return
        e.preventDefault()
        setIsDragOver(false)
        const id = e.dataTransfer.getData('text/task-id')
        if (id) onDropTask(id)
      }}
    >
      {/* Cabecera fija de la columna */}
      <div className="flex items-center justify-between gap-2 border-b bg-background/70 px-3 py-2.5 rounded-t-xl shrink-0">
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight" title={column.title}>{column.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {column.isClientVisible && (
            <span title="Columna visible para el cliente">
              <Users className="size-3 text-muted-foreground" aria-label="Visible para el cliente" />
            </span>
          )}
          <Badge variant="secondary" className="text-xs min-w-[1.4rem] justify-center">
            {tasks.length}
          </Badge>
          {canCreateTask && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 rounded-full text-muted-foreground transition-all duration-150 hover:scale-110 hover:bg-primary/10 hover:text-primary focus-visible:scale-110 focus-visible:bg-primary/10 focus-visible:text-primary"
              onClick={onCreateTask}
              aria-label={`Crear tarea en ${column.title}`}
              title={`Nueva tarea en ${column.title}`}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/*
        Cuerpo con alto fijo: todas las columnas ocupan el mismo espacio.
        Si hay muchas tareas, se activa scroll solo dentro de esta area.
      */}
      <div
        className="overflow-y-auto p-2 flex flex-col gap-2"
        style={{ height: `${COLUMN_BODY_HEIGHT}px` }}
        aria-label={`Tareas de la columna ${column.title}`}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-xs text-muted-foreground opacity-50">
              {canDrag ? 'Arrastra tareas aqui' : 'Sin tareas'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              canDrag={canDrag}
              onClick={() => onSelectTask(task)}
            />
          ))
        )}
      </div>
    </section>
  )
}
