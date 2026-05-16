import type { ProjectType } from '@/features/collab/model'

export const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { label: string; bg: string; text: string; border: string }
> = {
  campaign_service: { label: 'Campana',  bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  product_order:    { label: 'Producto', bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
}

