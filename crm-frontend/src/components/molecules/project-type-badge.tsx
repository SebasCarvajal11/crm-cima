import type { ProjectType } from '@/features/collab/model'
import { PROJECT_TYPE_CONFIG } from './project-type-config'

type Props = {
  type: ProjectType
  className?: string
}

/** Molecula: badge de tipo de proyecto (campana/producto). */
export function ProjectTypeBadge({ type, className = '' }: Props) {
  const cfg = PROJECT_TYPE_CONFIG[type]
  return (
    <span
      className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
      aria-label={`Tipo: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  )
}
