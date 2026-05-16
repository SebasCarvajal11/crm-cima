import { api } from '@/shared/lib'
import type {
  AvatarUploadResponse,
  CurrentAvatarResponse,
  DocumentUploadResponse,
  UserAvatarsResponse,
} from '@/shared/types'

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

export type {
  AvatarUploadResponse,
  CurrentAvatarResponse,
  DocumentUploadResponse,
  UserAvatarsResponse,
}

export async function uploadAvatarRequest(accessToken: string, file: File): Promise<AvatarUploadResponse> {
  const form = new FormData()
  form.append('file', file)

  return api
    .post('media/avatars', {
      headers: bearer(accessToken),
      body: form,
    })
    .json<AvatarUploadResponse>()
}

export async function getCurrentAvatarRequest(accessToken: string): Promise<CurrentAvatarResponse> {
  return api
    .get('media/avatars/current', {
      headers: bearer(accessToken),
    })
    .json<CurrentAvatarResponse>()
}

export async function getUserAvatarsRequest(accessToken: string, userIds: string[]): Promise<UserAvatarsResponse> {
  return api
    .get('media/avatars/users', {
      headers: bearer(accessToken),
      searchParams: { ids: userIds.join(',') },
    })
    .json<UserAvatarsResponse>()
}

export async function uploadDocumentRequest(accessToken: string, file: File): Promise<DocumentUploadResponse> {
  const form = new FormData()
  form.append('file', file)

  return api
    .post('media/documents', {
      headers: bearer(accessToken),
      body: form,
    })
    .json<DocumentUploadResponse>()
}
