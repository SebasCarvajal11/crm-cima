export type ProjectType = 'campaign_service' | 'product_order'
export type ParentProjectStatus = 'todo' | 'in_progress' | 'in_review' | 'completed'
export type ProjectMemberRole = 'admin' | 'worker' | 'client'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskColumnKey =
  | 'pending'
  | 'doing'
  | 'internal_review'
  | 'client_approval'
  | 'blocked'
  | 'done'
  | 'art_approved'
  | 'in_production'
  | 'quality_control'
  | 'shipped'
  | 'completed'
  | 'waiting_material'

/** Campos devueltos por GET /projects (filtrado por gateway allow list). */
export type ProjectListItem = {
  id: string
  name: string
  clientName: string
  type: ProjectType
  status: ParentProjectStatus
  progressPercent: number
  unreadNotifications: number
}

export type ProjectSearchResult = {
  id: string
  name: string
  clientName: string
  clientEmail: string | null
  type: ProjectType
  status: ParentProjectStatus
  progressPercent: number
}

/** Proyecto completo (devuelto por workspace y endpoints individuales). */
export type Project = ProjectListItem & {
  description: string | null
  clientSub: string | null
  adminResponsibleSub: string
  estimatedDueDate: string | null
  latestApprovedFileId: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type ProjectMember = {
  projectId: string
  userSub: string
  role: ProjectMemberRole
  email: string | null
  role_label?: string | null
  first_name: string | null
  last_name: string | null
  client_kind: 'natural' | 'juridical' | null
  company_name: string | null
  profession: string | null
  taskCount: number
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectTaskColumn = {
  id: string
  projectId: string
  key: TaskColumnKey
  title: string
  position: number
  isClientVisible: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type ProjectTask = {
  id: string
  projectId: string
  columnId: string
  title: string
  description: string | null
  priority: TaskPriority
  assigneeSub: string | null
  reporterSub: string
  deadline: string | null
  checklistProgress: number
  blockedByTaskId: string | null
  isClientVisible: boolean
  position: number
  subtasks: { id: string; title: string; isCompleted: boolean; assigneeSub?: string | null }[] | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectChatMessage = {
  id: string
  projectId: string
  channel: 'internal' | 'external' | 'system'
  messageType: 'text' | 'minor_request' | 'formal_request' | 'milestone'
  authorSub: string | null
  authorEmail: string | null
  authorFirstName: string | null
  authorLastName: string | null
  authorRole: string | null
  authorProfession: string | null
  body: string
  mentionedSubs: string[] | null
  metadata: Record<string, unknown> | null
  createdAt: string
  readStatus?: {
    isSeen: boolean
    requiredCount: number
    seenCount: number
  }
}

export type ProjectWorkspaceResponse = {
  project: Project
  members: ProjectMember[]
  board: {
    columns: ProjectTaskColumn[]
    tasks: ProjectTask[]
  }
  brief: {
    projectId: string
    content: string
    updatedBySub: string
    updatedAt: string
  } | null
  formalChanges: Array<{
    id: string
    status: string
    title: string
    createdAt: string
  }>
}

export type ProjectBoardResponse = {
  project: Project
  members: ProjectMember[]
  board: {
    columns: ProjectTaskColumn[]
    tasks: ProjectTask[]
  }
}

export type ProjectBrief = {
  projectId: string
  content: string
  updatedBySub: string
  updatedAt: string
}

export type FileFolder = 'mockups' | 'final_arts' | 'briefs' | 'contracts' | 'shared_deliverables'
export type FileOrigin = 'internal_chat' | 'external_chat' | 'manual_upload'

export type ProjectFile = {
  id: string
  projectId: string
  taskId: string | null
  title: string | null
  description: string | null
  origin: FileOrigin
  folder: FileFolder
  fileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  version: number
  isActive: boolean
  isClientVisible: boolean
  approvedByClient: boolean
  approvedBySub: string | null
  approvedAt: string | null
  createdBySub: string
  createdByEmail: string | null
  createdAt: string
}

export type ProjectFileEnriched = ProjectFile & {
  taskTitle: string | null
  currentColumnTitle: string | null
}

export type ProjectTimelineItem = {
  id: string
  kind: 'file' | 'task_completed' | 'change_accepted'
  label: 'Archivo' | 'Tarea finalizada' | 'Cambio aceptado'
  title: string
  occurredAt: string
  fileId: string | null
  fileName: string | null
  mimeType: string | null
  taskId: string | null
  changeRequestId: string | null
  createdBySub: string | null
  createdByEmail: string | null
  isClientVisible: boolean
}

export type ProjectTaskAssignee = {
  taskId: string
  userSub: string
  userEmail: string
  createdAt: string
}

export type ProjectTaskComment = {
  id: string
  taskId: string
  authorSub: string
  authorEmail: string
  content: string
  createdAt: string
}

export type ChangeRequestType = 'minor' | 'formal'
export type ChangeRequestStatus = 'open' | 'accepted' | 'rejected' | 'escalated' | 'approved'

export type ProjectChangeRequest = {
  id: string
  projectId: string
  taskId: string | null
  type: ChangeRequestType
  status: ChangeRequestStatus
  requestedBySub: string
  resolvedBySub: string | null
  title: string
  description: string
  justification: string | null
  createdAt: string
  resolvedAt: string | null
}

export type DataResponse<T> = {
  data: T
}

export type PaginatedData<T> = {
  items: T[]
  page: number
  limit: number
  total: number
  total_pages: number
}


export type ChatMentionNotification = {
  id: string
  project_id: string
  project_name: string
  message_id: string
  channel: 'internal' | 'external' | 'system'
  created_at: string
  message_preview: string
  author_sub: string | null
  author_email: string | null
  author_name: string
}
