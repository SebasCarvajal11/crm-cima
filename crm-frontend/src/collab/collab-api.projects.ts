import { api } from '@/lib/api'
import type {
  DataResponse,
  Project,
  ProjectBrief,
  ProjectChangeRequest,
  ProjectFile,
  ProjectFileEnriched,
  ProjectListItem,
  ProjectWorkspaceResponse,
} from './collab.types'

export const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` })

export async function listProjectsRequest(
  accessToken: string,
  params?: { page?: number; limit?: number; type?: Project['type']; status?: Project['status'] }
): Promise<DataResponse<ProjectListItem[]>> {
  const searchParams: Record<string, string> = {}
  if (params?.page != null) searchParams.page = String(params.page)
  if (params?.limit != null) searchParams.limit = String(params.limit)
  if (params?.type) searchParams.type = params.type
  if (params?.status) searchParams.status = params.status
  return api.get('projects', { headers: bearer(accessToken), searchParams }).json<DataResponse<ProjectListItem[]>>()
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

export async function listFilesRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectFile[]>> {
  return api.get(`projects/${projectId}/files`, { headers: bearer(accessToken) }).json<DataResponse<ProjectFile[]>>()
}

export async function listProjectFilesEnrichedRequest(
  accessToken: string,
  projectId: string
): Promise<DataResponse<ProjectFileEnriched[]>> {
  return api.get(`projects/${projectId}/files`, { headers: bearer(accessToken) }).json<DataResponse<ProjectFileEnriched[]>>()
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
  projectId: string
): Promise<DataResponse<Array<{ id: string; description: string; createdAt: string }>>> {
  return api.get(`projects/${projectId}/change-log/formal`, { headers: bearer(accessToken) }).json()
}
