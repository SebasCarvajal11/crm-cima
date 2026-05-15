import { api } from '@/lib/api'
import type { DashboardBffResponse } from './bff.types'
import { dashboardBffResponseSchema } from './bff.types'

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

/** Obtiene identidad + proyectos en una sola llamada al gateway. */
export async function fetchDashboardBff(
  accessToken: string
): Promise<DashboardBffResponse> {
  const payload = await api
    .get('bff/dashboard', { headers: bearer(accessToken) })
    .json<DashboardBffResponse>()

  const parsed = dashboardBffResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('Respuesta invalida de /bff/dashboard')
  }

  const identity = parsed.data.identity
  return {
    identity: {
      email: identity.email,
      role: identity.role,
      id: identity.id,
      first_name: identity.first_name ?? null,
      last_name: identity.last_name ?? null,
      client_kind: identity.client_kind ?? null,
      company_name: identity.company_name ?? null,
      profession: identity.profession ?? null,
      emailVerifiedAt: identity.emailVerifiedAt ?? null,
      force_password_change: identity.force_password_change,
    },
    projects: {
      data: parsed.data.projects.data ?? [],
    },
  }
}
