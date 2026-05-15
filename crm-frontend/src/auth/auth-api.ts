/**
 * Llamadas HTTP solo al API Gateway. URLs orientadas a features, no a microservicios.
 * Los endpoints publicos de auth (login, refresh, forgot-password, etc.) mantienen /auth/.
 * Los endpoints autenticados usan /identity/, /account/, /admin/.
 */
import { api } from '@/lib/api'
import type {
  AcceptInviteResponse,
  AdminUsersListResponse,
  ForgotPasswordResponse,
  InviteClientResponse,
  InviteAdminResponse,
  InvitePreviewResponse,
  LoginResponse,
  MeResponse,
  MessageResponse,
  RefreshResponse,
  RegisterWorkerResponse,
  SessionsResponse,
  UserRole,
} from './auth.types'

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

// ── Auth publico (sin cambios — URLs genericas) ──────────────────────────────

export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResponse> {
  return api
    .post('auth/login', {
      json: { email, password },
      timeout: 15_000,
    })
    .json<LoginResponse>()
}

export async function refreshSessionRequest(): Promise<RefreshResponse> {
  return api.post('auth/refresh').json<RefreshResponse>()
}

export async function forgotPasswordRequest(body: {
  email: string
}): Promise<ForgotPasswordResponse> {
  return api.post('auth/forgot-password', { json: body }).json<ForgotPasswordResponse>()
}

export async function resetPasswordRequest(body: {
  token: string
  password: string
}): Promise<MessageResponse> {
  return api.post('auth/reset-password', { json: body }).json<MessageResponse>()
}

export async function getInvitationPreviewRequest(
  token: string
): Promise<InvitePreviewResponse> {
  const safe = encodeURIComponent(token)
  return api.get(`auth/accept-invite/${safe}`).json<InvitePreviewResponse>()
}

export async function acceptInviteRequest(body: {
  token: string
  password: string
}): Promise<AcceptInviteResponse> {
  return api.post('auth/accept-invite', { json: body }).json<AcceptInviteResponse>()
}

export async function verifyEmailRequest(body: {
  token: string
}): Promise<MessageResponse> {
  return api.post('auth/verify-email', { json: body }).json<MessageResponse>()
}

// ── Identidad (/identity/) ───────────────────────────────────────────────────

export async function fetchMe(accessToken: string): Promise<MeResponse> {
  return api
    .get('identity/me', {
      headers: bearer(accessToken),
    })
    .json<MeResponse>()
}

export async function logoutRequest(accessToken: string): Promise<void> {
  await api.post('identity/logout', {
    headers: bearer(accessToken),
  })
}

export type ClientSearchResult = { subject: string; email: string; role: UserRole }

export async function searchClientsRequest(
  accessToken: string,
  q: string,
  role: UserRole = 'client'
): Promise<{ data: ClientSearchResult[] }> {
  return api
    .get('identity/search', {
      headers: bearer(accessToken),
      searchParams: { q, role },
    })
    .json<{ data: ClientSearchResult[] }>()
}

// ── Cuenta (/account/) ──────────────────────────────────────────────────────

export async function changePasswordRequest(
  accessToken: string,
  body: { old_password: string; new_password: string }
): Promise<MessageResponse> {
  return api
    .post('account/password', {
      headers: bearer(accessToken),
      json: body,
    })
    .json<MessageResponse>()
}

export async function listSessionsRequest(
  accessToken: string
): Promise<SessionsResponse> {
  return api
    .get('account/sessions', {
      headers: bearer(accessToken),
    })
    .json<SessionsResponse>()
}

export async function revokeSessionRequest(
  accessToken: string,
  familyId: string
): Promise<MessageResponse> {
  return api
    .delete(`account/sessions/${familyId}`, {
      headers: bearer(accessToken),
    })
    .json<MessageResponse>()
}

export async function requestEmailVerificationRequest(
  accessToken: string
): Promise<MessageResponse> {
  return api
    .post('account/verify-email/request', {
      headers: bearer(accessToken),
    })
    .json<MessageResponse>()
}

// ── Admin (/admin/) ─────────────────────────────────────────────────────────

export async function registerWorkerRequest(
  accessToken: string,
  body: { email: string; first_name: string; last_name: string; profession: string }
): Promise<RegisterWorkerResponse> {
  return api
    .post('admin/workers', {
      headers: bearer(accessToken),
      json: body,
    })
    .json<RegisterWorkerResponse>()
}

export async function inviteClientRequest(
  accessToken: string,
  body: {
    email: string
    first_name: string
    last_name: string
    client_kind: 'natural' | 'juridical'
    company_name?: string
  }
): Promise<InviteClientResponse> {
  return api
    .post('admin/clients/invite', {
      headers: bearer(accessToken),
      json: body,
    })
    .json<InviteClientResponse>()
}

export async function inviteAdminRequest(
  accessToken: string,
  body: {
    email: string
    first_name: string
    last_name: string
    secret_password: string
  }
): Promise<InviteAdminResponse> {
  return api
    .post('admin/admins/invite', {
      headers: bearer(accessToken),
      json: body,
    })
    .json<InviteAdminResponse>()
}

export type AdminListUsersParams = {
  page?: number
  limit?: number
  role?: UserRole
  include_deleted?: boolean
  q?: string
}

export async function adminListUsersRequest(
  accessToken: string,
  params: AdminListUsersParams
): Promise<AdminUsersListResponse> {
  const searchParams: Record<string, string> = {}
  if (params.page != null) searchParams.page = String(params.page)
  if (params.limit != null) searchParams.limit = String(params.limit)
  if (params.role) searchParams.role = params.role
  if (params.include_deleted === true) searchParams.include_deleted = 'true'
  if (params.q?.trim()) searchParams.q = params.q.trim()

  return api
    .get('admin/users', {
      headers: bearer(accessToken),
      searchParams,
    })
    .json<AdminUsersListResponse>()
}

export async function adminPatchUserStatusRequest(
  accessToken: string,
  subject: string,
  body: { is_active: boolean }
): Promise<MessageResponse> {
  return api
    .patch(`admin/users/${subject}/status`, {
      headers: bearer(accessToken),
      json: body,
    })
    .json<MessageResponse>()
}

export async function adminPatchUserFlagsRequest(
  accessToken: string,
  subject: string,
  body: { force_password_change: boolean }
): Promise<MessageResponse> {
  return api
    .patch(`admin/users/${subject}/flags`, {
      headers: bearer(accessToken),
      json: body,
    })
    .json<MessageResponse>()
}

export async function adminRestoreUserRequest(
  accessToken: string,
  subject: string
): Promise<MessageResponse> {
  return api
    .post(`admin/users/${subject}/restore`, {
      headers: bearer(accessToken),
    })
    .json<MessageResponse>()
}

export async function adminSoftDeleteUserRequest(
  accessToken: string,
  subject: string
): Promise<MessageResponse> {
  return api
    .delete(`admin/users/${subject}`, {
      headers: bearer(accessToken),
    })
    .json<MessageResponse>()
}
