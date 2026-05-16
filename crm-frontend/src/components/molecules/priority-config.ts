import type { ProjectTask } from '@/features/collab/model'

export const PRIORITY_CONFIG: Record<
  ProjectTask['priority'],
  { label: string; borderLeft: string; bg: string; text: string }
> = {
  low:    { label: 'Baja',    borderLeft: 'border-l-slate-300',  bg: 'bg-slate-100',  text: 'text-slate-600' },
  medium: { label: 'Media',   borderLeft: 'border-l-sky-400',    bg: 'bg-sky-100',    text: 'text-sky-700' },
  high:   { label: 'Alta',    borderLeft: 'border-l-amber-400',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  urgent: { label: 'Urgente', borderLeft: 'border-l-rose-500',   bg: 'bg-rose-100',   text: 'text-rose-700' },
}

