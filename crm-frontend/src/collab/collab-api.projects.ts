import { api } from '@/lib/api'
import type {
  DataResponse,
  PaginatedData,
  Project,
  ProjectMember,
  ProjectBrief,
  ProjectBoardResponse,
  ProjectChangeRequest,
  ProjectFileEnriched,
  ProjectListItem,
  ProjectSearchResult,
  ProjectTimelineItem,
  ProjectWorkspaceResponse,
} from './collab.types'

export const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` })

export async function listProjectsRequest(
  accessToken: string,
  params?: { page?: number; limit?: number; type?: Project['type']; status?: Project['status'] }
): Promise<DataResponse<PaginatedData<ProjectListItem>>> {
  const searchParams: Record<string, string> = {}
  if (params?.page != null) searchParams.page = String(params.page)
  if (params?.limit != null) searchParams.limit = String(params.limit)
  if (params?.type) searchParams.type = params.type
  if (params?.status) searchParams.status = params.status
  return api.get('projects', { headers: bearer(accessToken), searchParams }).json<DataResponse<PaginatedData<ProjectListItem>>>()
}

export async function updateProjectRequest(
  accessToken: string,
  projectId: string,
  body: {
    name?: string
    description?: string | null
    status?: Project['status']
    estimated_due_date?: string | null
    progress_percent?: number
  }
): Promise<DataResponse<Project>> {
  return api.patch(`projects/${projectId}`, { headers: bearer(accessToken), json: body }).json<DataResponse<Project>>()
}

export async function createProjectRequest(
  accessToken: string,
  body: {
    name: string
    description?: string
    client_name: string
    client_sub?: string
    worker_subs: string[]
    type: Project['type']
    brief?: string
  }
): Promise<DataResponse<Project>> {
  return api.post('projects', { headers: bearer(accessToken), json: body }).json<DataResponse<Project>>()
}

export async function getProjectWorkspaceRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectWorkspaceResponse>> {
  return api.get(`projects/${projectId}/workspace`, { headers: bearer(accessToken) }).json<DataResponse<ProjectWorkspaceResponse>>()
}

export async function getProjectBoardRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectBoardResponse>> {
  return api.get(`projects/${projectId}/board`, { headers: bearer(accessToken) }).json<DataResponse<ProjectBoardResponse>>()
}

export async function searchProjectsRequest(
  accessToken: string,
  params: { q: string; limit?: number }
): Promise<DataResponse<ProjectSearchResult[]>> {
  const searchParams: Record<string, string> = { q: params.q }
  if (params.limit != null) searchParams.limit = String(params.limit)
  return api.get('projects/search', { headers: bearer(accessToken), searchParams }).json<DataResponse<ProjectSearchResult[]>>()
}

export async function getBriefRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectBrief>> {
  return api.get(`projects/${projectId}/brief`, { headers: bearer(accessToken) }).json<DataResponse<ProjectBrief>>()
}

export async function updateBriefRequest(
  accessToken: string,
  projectId: string,
  body: { body: string }
): Promise<DataResponse<ProjectBrief>> {
  return api.patch(`projects/${projectId}/brief`, { headers: bearer(accessToken), json: body }).json<DataResponse<ProjectBrief>>()
}

export async function listProjectFilesEnrichedRequest(
  accessToken: string,
  projectId: string,
  params?: { page?: number; limit?: number }
): Promise<DataResponse<PaginatedData<ProjectFileEnriched>>> {
  const searchParams: Record<string, string> = {}
  if (params?.page != null) searchParams.page = String(params.page)
  if (params?.limit != null) searchParams.limit = String(params.limit)
  return api.get(`projects/${projectId}/files`, { headers: bearer(accessToken), searchParams }).json()
}

export async function upsertProjectMemberRequest(
  accessToken: string,
  projectId: string,
  body: { user_sub: string; role: 'admin' | 'worker' | 'client'; user_email?: string }
): Promise<DataResponse<ProjectMember>> {
  return api.put(`projects/${projectId}/members`, { headers: bearer(accessToken), json: body }).json<DataResponse<ProjectMember>>()
}

export async function listProjectMembersRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectMember[]>> {
  return api.get(`projects/${projectId}/members`, { headers: bearer(accessToken) }).json<DataResponse<ProjectMember[]>>()
}

export async function listProjectTimelineRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectTimelineItem[]>> {
  return api.get(`projects/${projectId}/timeline`, { headers: bearer(accessToken) }).json<DataResponse<ProjectTimelineItem[]>>()
}

export const listProjectFilesTimelineRequest = listProjectTimelineRequest

export async function uploadProjectConversationFileRequest(
  accessToken: string,
  projectId: string,
  body: {
    file: File
    title: string
    description?: string
    isClientVisible: boolean
  }
) {
  const form = new FormData()
  form.append('file', body.file)
  form.append('title', body.title)
  if (body.description?.trim()) form.append('description', body.description.trim())
  form.append('is_client_visible', String(body.isClientVisible))
  // Backward compatibility: older backend contracts still expect channel.
  form.append('channel', body.isClientVisible ? 'external' : 'internal')
  return api.post(`projects/${projectId}/files/upload`, { headers: bearer(accessToken), body: form }).json()
}

export async function createProjectFileMetadataRequest(
  accessToken: string,
  projectId: string,
  body: {
    fileName: string
    title: string
    description?: string | null
    storagePath: string
    mimeType: string
    sizeBytes: number
    isClientVisible: boolean
    origin: 'internal_chat' | 'external_chat' | 'manual_upload'
  }
) {
  return api.post(`projects/${projectId}/files`, {
    headers: bearer(accessToken),
    json: {
      file_name: body.fileName,
      title: body.title,
      description: body.description ?? null,
      storage_path: body.storagePath,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
      folder: 'shared_deliverables',
      is_client_visible: body.isClientVisible,
      origin: body.origin,
    },
  }).json()
}

export async function deleteProjectFileRequest(accessToken: string, fileId: string) {
  return api.delete(`files/${fileId}`, { headers: bearer(accessToken) }).json()
}

export function getProjectFileDownloadUrl(fileId: string, preview = false): string {
  return preview ? `/api/files/${fileId}/download?preview=true` : `/api/files/${fileId}/download`
}

export async function getProjectFileAccessRequest(
  accessToken: string,
  fileId: string,
  preview = false
): Promise<DataResponse<{ url: string; expiresInSeconds: number }>> {
  const searchParams = preview ? { preview: 'true' } : undefined
  return api.get(`files/${fileId}/access`, { headers: bearer(accessToken), searchParams }).json()
}

export async function updateProjectFileRequest(
  accessToken: string,
  fileId: string,
  body: { title?: string; description?: string | null; task_id?: string | null; is_client_visible?: boolean }
) {
  return api.patch(`files/${fileId}`, { headers: bearer(accessToken), json: body }).json()
}

export async function createMinorChangeRequestRequest(
  accessToken: string,
  projectId: string,
  body: { task_id: string; title: string; description: string }
): Promise<DataResponse<ProjectChangeRequest>> {
  return api
    .post(`projects/${projectId}/change-requests/minor`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectChangeRequest>>()
}

export async function createFormalChangeRequestRequest(
  accessToken: string,
  projectId: string,
  body: { task_id?: string; title: string; description: string; justification: string }
): Promise<DataResponse<ProjectChangeRequest>> {
  return api
    .post(`projects/${projectId}/change-requests/formal`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectChangeRequest>>()
}

export async function resolveChangeRequestRequest(
  accessToken: string,
  projectId: string,
  changeRequestId: string,
  body: { status: 'accepted' | 'rejected' | 'escalated' | 'approved' }
): Promise<DataResponse<ProjectChangeRequest>> {
  return api
    .patch(`projects/${projectId}/change-requests/${changeRequestId}`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectChangeRequest>>()
}

export async function listFormalChangeLogRequest(
  accessToken: string,
  projectId: string,
  params?: { page?: number; limit?: number }
): Promise<DataResponse<PaginatedData<{ id: string; description: string; createdAt: string }>>> {
  const searchParams: Record<string, string> = {}
  if (params?.page != null) searchParams.page = String(params.page)
  if (params?.limit != null) searchParams.limit = String(params.limit)
  return api.get(`projects/${projectId}/change-log/formal`, { headers: bearer(accessToken), searchParams }).json()
}
