import { api } from '@/lib/api'
import type { DashboardBffResponse } from './bff.types'

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

/** Obtiene identidad + proyectos en una sola llamada al gateway. */
export async function fetchDashboardBff(
  accessToken: string
): Promise<DashboardBffResponse> {
  return api
    .get('bff/dashboard', { headers: bearer(accessToken) })
    .json<DashboardBffResponse>()
}
