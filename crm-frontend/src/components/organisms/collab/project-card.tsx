import { Bell, User } from 'lucide-react'
import { ProjectTypeBadge } from '@/components/molecules/project-type-badge'
import type { ProjectListItem } from '@/collab/collab.types'

type Props = {
  project: ProjectListItem
  onClick: () => void
}

/** Organismo: tarjeta kanban de un proyecto en el tablero padre. */
export function ProjectCard({ project, onClick }: Props) {
  const pct = project.progressPercent

  const progressColor =
    pct === 100 ? 'bg-emerald-500' :
    pct >= 70   ? 'bg-blue-500'    :
    pct >= 35   ? 'bg-amber-400'   : 'bg-slate-300'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Abrir proyecto ${project.name}, cliente ${project.clientName}, ${pct}% completado`}
      className="group w-full text-left rounded-lg border border-border bg-background p-3.5 shadow-sm transition-all duration-150 hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {project.name}
        </span>
        {project.unreadNotifications > 0 && (
          <span
            className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5"
            aria-label={`${project.unreadNotifications} notificacion${project.unreadNotifications > 1 ? 'es' : ''} sin leer`}
          >
            <Bell className="size-2.5" aria-hidden="true" />
            {project.unreadNotifications}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5"
        aria-label={`Cliente: ${project.clientName}`}
      >
        <User className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{project.clientName}</span>
      </div>

      <div className="mb-3">
        <ProjectTypeBadge type={project.type} />
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso: ${pct}%`}
      >
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progreso</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.max(pct > 0 ? 6 : 0, pct)}%` }}
          />
        </div>
      </div>
    </button>
  )
}
