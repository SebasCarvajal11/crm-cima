import { api } from '@/lib/api'
import { bearer } from './collab-api.projects'
import type { DataResponse, PaginatedData, ProjectChatMessage } from './collab.types'

export async function listExternalChatRequest(
  accessToken: string,
  projectId: string,
  params?: { page?: number; limit?: number }
): Promise<DataResponse<PaginatedData<ProjectChatMessage>>> {
  return api
    .get(`projects/${projectId}/chat/external`, { headers: bearer(accessToken) })
    .json<DataResponse<PaginatedData<ProjectChatMessage>>>()
}

export async function postExternalChatRequest(
  accessToken: string,
  projectId: string,
  body: { body: string; mentions?: string[] }
): Promise<DataResponse<ProjectChatMessage>> {
  return api
    .post(`projects/${projectId}/chat/external`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectChatMessage>>()
}

export async function listInternalChatRequest(
  accessToken: string,
  projectId: string,
  params?: { page?: number; limit?: number }
): Promise<DataResponse<PaginatedData<ProjectChatMessage>>> {
  return api
    .get(`projects/${projectId}/chat/internal`, { headers: bearer(accessToken) })
    .json<DataResponse<PaginatedData<ProjectChatMessage>>>()
}

export async function postInternalChatRequest(
  accessToken: string,
  projectId: string,
  body: { body: string; mentions?: string[] }
): Promise<DataResponse<ProjectChatMessage>> {
  return api
    .post(`projects/${projectId}/chat/internal`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectChatMessage>>()
}

export async function markExternalChatReadRequest(
  accessToken: string,
  projectId: string,
  body: { up_to_message_id?: string; message_ids?: string[] }
) {
  return api
    .post(`projects/${projectId}/chat/external/read`, { headers: bearer(accessToken), json: body })
    .json()
}

export async function markInternalChatReadRequest(
  accessToken: string,
  projectId: string,
  body: { up_to_message_id?: string; message_ids?: string[] }
) {
  return api
    .post(`projects/${projectId}/chat/internal/read`, { headers: bearer(accessToken), json: body })
    .json()
}
