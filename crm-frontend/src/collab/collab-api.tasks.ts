import { api } from '@/lib/api'
import { bearer } from './collab-api.projects'
import type {
  DataResponse,
  ProjectFile,
  ProjectTask,
  ProjectTaskComment,
} from './collab.types'

export async function createTaskRequest(
  accessToken: string,
  projectId: string,
  body: {
    column_id: string
    title: string
    description?: string
    priority?: ProjectTask['priority']
    assignees?: { user_sub: string; user_email: string }[]
    due_date?: string
    client_visible?: boolean
    checklist_progress?: number
    position?: number
    subtasks?: { id: string; title: string; is_completed: boolean; assignee_sub?: string | null }[]
  }
): Promise<DataResponse<ProjectTask>> {
  return api
    .post(`projects/${projectId}/tasks`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectTask>>()
}

export async function patchTaskRequest(
  accessToken: string,
  taskId: string,
  body: {
    column_id?: string
    title?: string
    description?: string | null
    priority?: ProjectTask['priority']
    assignees?: { user_sub: string; user_email: string }[]
    due_date?: string | null
    checklist_progress?: number
    client_visible?: boolean
    position?: number
    subtasks?: { id: string; title: string; is_completed: boolean; assignee_sub?: string | null }[]
  }
): Promise<DataResponse<ProjectTask>> {
  return api
    .patch(`tasks/${taskId}`, { headers: bearer(accessToken), json: body })
    .json<DataResponse<ProjectTask>>()
}

export async function listTaskCommentsRequest(
  accessToken: string,
  projectId: string,
  taskId: string
): Promise<DataResponse<ProjectTaskComment[]>> {
  return api
    .get(`projects/${projectId}/tasks/${taskId}/comments`, { headers: bearer(accessToken) })
    .json<DataResponse<ProjectTaskComment[]>>()
}

export async function createTaskCommentRequest(
  accessToken: string,
  projectId: string,
  taskId: string,
  content: string
): Promise<DataResponse<ProjectTaskComment>> {
  return api
    .post(`projects/${projectId}/tasks/${taskId}/comments`, { headers: bearer(accessToken), json: { content } })
    .json<DataResponse<ProjectTaskComment>>()
}

export async function listTaskFilesRequest(
  accessToken: string,
  projectId: string,
  taskId: string
): Promise<DataResponse<ProjectFile[]>> {
  return api
    .get(`projects/${projectId}/tasks/${taskId}/files`, { headers: bearer(accessToken) })
    .json<DataResponse<ProjectFile[]>>()
}

export async function uploadTaskFileRequest(
  accessToken: string,
  projectId: string,
  taskId: string,
  title: string,
  description: string,
  body: {
    fileName: string
    storagePath: string
    mimeType: string
    sizeBytes: number
    isClientVisible: boolean
  }
): Promise<DataResponse<ProjectFile>> {
  return api
    .post(`projects/${projectId}/tasks/${taskId}/files/metadata`, {
      headers: bearer(accessToken),
      json: {
        title,
        description,
        file_name: body.fileName,
        storage_path: body.storagePath,
        mime_type: body.mimeType,
        size_bytes: body.sizeBytes,
        is_client_visible: body.isClientVisible,
      },
    })
    .json<DataResponse<ProjectFile>>()
}

export async function getFileAccessRequest(
  accessToken: string,
  fileId: string,
  preview = false
): Promise<DataResponse<{ url: string; expiresInSeconds: number }>> {
  const searchParams = preview ? { preview: 'true' } : undefined
  return api.get(`files/${fileId}/access`, { headers: bearer(accessToken), searchParams }).json()
}
