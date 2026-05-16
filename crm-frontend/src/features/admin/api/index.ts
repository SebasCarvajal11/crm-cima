import { api } from '@/shared/lib'
import type {
  AdminUsersListResponse,
  InviteAdminResponse,
  InviteClientResponse,
  RegisterWorkerResponse,
  UserRole,
} from '@/shared/types'

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

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
): Promise<{ message: string }> {
  return api
    .patch(`admin/users/${subject}/status`, {
      headers: bearer(accessToken),
      json: body,
    })
    .json<{ message: string }>()
}

export async function adminPatchUserFlagsRequest(
  accessToken: string,
  subject: string,
  body: { force_password_change: boolean }
): Promise<{ message: string }> {
  return api
    .patch(`admin/users/${subject}/flags`, {
      headers: bearer(accessToken),
      json: body,
    })
    .json<{ message: string }>()
}

export async function adminRestoreUserRequest(
  accessToken: string,
  subject: string
): Promise<{ message: string }> {
  return api
    .post(`admin/users/${subject}/restore`, {
      headers: bearer(accessToken),
    })
    .json<{ message: string }>()
}

export async function adminSoftDeleteUserRequest(
  accessToken: string,
  subject: string
): Promise<{ message: string }> {
  return api
    .delete(`admin/users/${subject}`, {
      headers: bearer(accessToken),
    })
    .json<{ message: string }>()
}
