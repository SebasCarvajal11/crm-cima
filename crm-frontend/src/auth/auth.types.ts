/** Contratos alineados con mod-auth vía KrakenD (`mod-auth/openapi/openapi.yaml`). */

export type UserRole = 'admin' | 'worker' | 'client'

export type LoginResponse = {
  data: {
    access_token: string
    expires_in: number
    user: {
      id: string
      role: UserRole
      force_password_change?: boolean
    }
  }
}

export type RefreshResponse = {
  data: {
    access_token: string
  }
}

export type MeResponse = {
  data: {
    id: string
    email: string
    role: UserRole
    emailVerifiedAt: string | null
    force_password_change?: boolean
  }
}

export type SessionInfo = {
  family: string
  device_label: string
  expires_at: string
  last_activity_at: string
  is_current: boolean
}

export type SessionsResponse = {
  data: {
    sessions: SessionInfo[]
  }
}

export type MessageResponse = {
  message: string
}

export type ForgotPasswordResponse = {
  message: string
  data?: {
    token?: string
  }
}

export type InvitePreviewResponse = {
  data: {
    email: string
  }
}

export type AcceptInviteResponse = {
  data: {
    access_token: string
    user: {
      id: string
      role: UserRole
      force_password_change?: boolean
    }
  }
}

export type RegisterWorkerResponse = {
  data: {
    user: {
      id: string
      email: string
      role: UserRole
      force_password_change?: boolean
    }
    temp_password?: string
  }
}

export type InviteClientResponse = {
  message: string
  data: {
    token?: string
  }
}

export type AdminUserRow = {
  id: string
  email: string
  role: UserRole
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

export type ApiErrorBody = {
  error: string
}
