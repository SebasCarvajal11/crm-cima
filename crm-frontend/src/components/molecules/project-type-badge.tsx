import type { ProjectType } from '@/collab/collab.types'

export const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { label: string; bg: string; text: string; border: string }
> = {
  campaign_service: { label: 'Campana',  bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  product_order:    { label: 'Producto', bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
}

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
