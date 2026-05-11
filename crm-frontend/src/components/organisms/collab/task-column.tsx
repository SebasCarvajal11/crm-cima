import { useState } from 'react'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  onSelectTask: (t: ProjectTask) => void
  onDropTask: (taskId: string) => void
}

/** Organismo: columna kanban de tareas con alto fijo y soporte drag-and-drop. */
export function TaskColumn({ column, tasks, selectedTaskId, canDrag, onSelectTask, onDropTask }: Props) {
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-background/70 rounded-t-xl shrink-0">
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <div className="flex items-center gap-1.5">
          {column.isClientVisible && (
            <span title="Columna visible para el cliente">
              <Users className="size-3 text-muted-foreground" aria-label="Visible para el cliente" />
            </span>
          )}
          <Badge variant="secondary" className="text-xs min-w-[1.4rem] justify-center">
            {tasks.length}
          </Badge>
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
