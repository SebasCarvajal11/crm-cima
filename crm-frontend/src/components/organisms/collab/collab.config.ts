import { CheckCircle2, Clock, Layers, Zap } from 'lucide-react'
import type { ParentProjectStatus, ProjectTask } from '@/features/collab/model'
import React from 'react'

/** Columnas del tablero kanban padre (por estado de proyecto). */
export const PARENT_COLUMNS: {
  key: ParentProjectStatus
  label: string
  accent: string
  headerBg: string
  emptyText: string
  icon: React.ReactNode
}[] = [
  {
    key:       'todo',
    label:     'Por Hacer',
    accent:    'border-t-slate-400',
    headerBg:  'bg-slate-100 dark:bg-slate-800/60',
    emptyText: 'Sin proyectos pendientes',
    icon:      React.createElement(Clock, { className: 'size-3.5' }),
  },
  {
    key:       'in_progress',
    label:     'En Curso',
    accent:    'border-t-blue-500',
    headerBg:  'bg-blue-50 dark:bg-blue-950/40',
    emptyText: 'Ningun proyecto activo',
    icon:      React.createElement(Zap, { className: 'size-3.5' }),
  },
  {
    key:       'in_review',
    label:     'En Revision',
    accent:    'border-t-amber-500',
    headerBg:  'bg-amber-50 dark:bg-amber-950/40',
    emptyText: 'Nada esperando revision',
    icon:      React.createElement(Layers, { className: 'size-3.5' }),
  },
  {
    key:       'completed',
    label:     'Completado',
    accent:    'border-t-emerald-500',
    headerBg:  'bg-emerald-50 dark:bg-emerald-950/40',
    emptyText: 'Sin proyectos finalizados',
    icon:      React.createElement(CheckCircle2, { className: 'size-3.5' }),
  },
]

/** Mapa de color del dot de estado (para informacion visual). */
export const STATUS_DOT: Record<ParentProjectStatus, string> = {
  todo:        'bg-slate-400',
  in_progress: 'bg-blue-500',
  in_review:   'bg-amber-500',
  completed:   'bg-emerald-500',
}

/** Peso numerico de prioridad para ordenar tareas (mayor = mas urgente). */
export const PRIORITY_WEIGHT: Record<ProjectTask['priority'], number> = {
  urgent: 4, high: 3, medium: 2, low: 1,
}

