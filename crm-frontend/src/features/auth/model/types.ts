/** Contratos alineados con mod-auth via KrakenD (`mod-auth/openapi/openapi.yaml`). */

import type {
  AdminUserRow,
  AdminUsersListResponse,
  ClientSearchResult,
  IdentityUser,
  InviteAdminResponse,
  InviteClientResponse,
  RegisterWorkerResponse,
  UserRole,
} from '@/shared/types'

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
  data: IdentityUser
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
}

export type InvitePreviewResponse = {
  data: {
    email: string
    first_name: string | null
    last_name: string | null
    client_kind: 'natural' | 'juridical' | null
    company_name: string | null
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

export type ApiErrorBody = {
  error: string
}

export type {
  AdminUserRow,
  AdminUsersListResponse,
  ClientSearchResult,
  IdentityUser,
  InviteAdminResponse,
  InviteClientResponse,
  RegisterWorkerResponse,
  UserRole,
}
