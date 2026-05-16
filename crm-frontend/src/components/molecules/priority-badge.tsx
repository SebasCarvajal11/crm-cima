import type { ProjectTask } from '@/features/collab/model'
import { PRIORITY_CONFIG } from './priority-config'

type Props = {
  priority: ProjectTask['priority']
  size?: 'xs' | 'sm'
}

/** Molecula: badge de prioridad con color semantico. */
export function PriorityBadge({ priority, size = 'xs' }: Props) {
  const p = PRIORITY_CONFIG[priority]
  const cls = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${cls} ${p.bg} ${p.text}`}
      aria-label={`Prioridad: ${p.label}`}
    >
      {p.label}
    </span>
  )
}
