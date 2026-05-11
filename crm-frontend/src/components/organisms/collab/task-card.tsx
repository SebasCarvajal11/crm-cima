import { Calendar, Clock, GripVertical, User, CheckSquare } from 'lucide-react'
import { PriorityBadge } from '@/components/molecules/priority-badge'
import type { ProjectTask } from '@/collab/collab.types'

type Props = {
  task: ProjectTask
  isSelected: boolean
  canDrag: boolean
  onClick: () => void
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' })

/** Organismo: tarjeta arrastrable de tarea en el tablero hijo. */
export function TaskCard({ task, isSelected, canDrag, onClick }: Props) {
  const borderLeft = {
    low:    'border-l-slate-300',
    medium: 'border-l-sky-400',
    high:   'border-l-amber-400',
    urgent: 'border-l-rose-500',
  }[task.priority]

  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return
        e.dataTransfer.setData('text/task-id', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Tarea: ${task.title}. Prioridad: ${task.priority}.`}
      className={`group w-full text-left rounded-lg border-l-4 border border-border bg-background p-3 shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer ${borderLeft} ${
        isSelected
          ? 'ring-2 ring-primary ring-offset-1 shadow-md'
          : 'hover:shadow-md hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium leading-snug line-clamp-2">{task.title}</span>
        {canDrag && (
          <GripVertical
            className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 cursor-grab transition-colors"
            aria-hidden="true"
          />
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1.5">
        <PriorityBadge priority={task.priority} />
        {task.isClientVisible && (
          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 gap-0.5">
            <User className="size-2.5" aria-hidden="true" />
            Cliente
          </span>
        )}
        {task.deadline && (
          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground gap-0.5">
            <Calendar className="size-2.5" aria-hidden="true" />
            {fmtShort(task.deadline)}
          </span>
        )}
      </div>

      {(task.subtasks && task.subtasks.length > 0) && (
        <div className="mt-2.5" role="progressbar" aria-valuenow={task.checklistProgress} aria-valuemin={0} aria-valuemax={100}>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-medium">
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3" />
              {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length}
            </span>
            <span>{task.checklistProgress}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${task.checklistProgress}%` }} />
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Clock className="size-2.5" aria-hidden="true" />
          Creada: {fmt(task.createdAt)}
        </span>
        <span>Actualizada: {fmt(task.updatedAt)}</span>
      </div>
    </button>
  )
}
