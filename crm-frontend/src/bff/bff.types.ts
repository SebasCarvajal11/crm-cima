import type { UserRole } from '@/auth/auth.types'
import type { ProjectListItem } from '@/collab/collab.types'

/** Respuesta del BFF /bff/dashboard — identidad + proyectos en un solo fetch. */
export type DashboardBffResponse = {
  identity: {
    email: string
    role: UserRole
    id: string
    force_password_change?: boolean
  }
  projects: {
    data: ProjectListItem[]
  }
}
