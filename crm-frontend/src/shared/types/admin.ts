import type { UserRole } from './identity'

export type AdminUserRow = {
  id: string
  email: string
  role: UserRole
  first_name: string | null
  last_name: string | null
  client_kind: 'natural' | 'juridical' | null
  company_name: string | null
  profession: string | null
  is_active: boolean
  deleted_at: string | null
  force_password_change: boolean
}

export type AdminUsersListResponse = {
  data: {
    items: AdminUserRow[]
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export type RegisterWorkerResponse = {
  data: {
    user: {
      id: string
      email: string
      role: UserRole
      first_name: string | null
      last_name: string | null
      profession: string | null
      force_password_change?: boolean
    }
  }
}

export type InviteAdminResponse = RegisterWorkerResponse & {
  message: string
}

export type InviteClientResponse = {
  message: string
}
