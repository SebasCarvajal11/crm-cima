import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, FileText, FolderOpen, KanbanSquare, MessageSquare, User, Users } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ProjectTypeBadge } from '@/components/molecules/project-type-badge'
import { parseApiError } from '@/auth/parse-api-error'
import { getProjectWorkspaceRequest, patchTaskRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { PARENT_COLUMNS, PRIORITY_WEIGHT, STATUS_DOT } from './collab.config'
import { TaskBoard } from './task-board'
import { ChatPanel } from './chat-panel'
import { ProjectFiles } from './project-files'
import { BriefPanel } from './brief-panel'
import { ProjectMembers } from './project-members'
import type { Project, ProjectListItem, ProjectMember, ProjectTask } from '@/collab/collab.types'
import type { MeResponse } from '@/auth/auth.types'

type WorkspaceTab = 'board' | 'chat' | 'files' | 'brief' | 'members'

type Props = {
  accessToken: string
  identity: MeResponse['data']
  projectId: string
  projectMeta: Project | ProjectListItem | null
  onBack: () => void
}

const TABS: { value: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { value: 'board',   label: 'Tablero',      icon: <KanbanSquare  className="size-4" /> },
  { value: 'chat',    label: 'Conversacion', icon: <MessageSquare className="size-4" /> },
  { value: 'files',   label: 'Archivos',     icon: <FolderOpen    className="size-4" /> },
  { value: 'brief',   label: 'Brief',        icon: <FileText      className="size-4" /> },
  { value: 'members', label: 'Integrantes',  icon: <Users         className="size-4" /> },
]

/** Organismo: workspace de un proyecto (tablero hijo + tabs de conversacion, archivos y brief). */
export function ProjectWorkspace({ accessToken, identity, projectId, projectMeta, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('board')
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)
  const queryClient = useQueryClient()

  const isClient   = identity.role === 'client'
  const canOperate = identity.role === 'admin' || identity.role === 'worker'

  const workspaceQ = useQuery({
    queryKey: collabKeys.projectWorkspace(projectId),
    queryFn:  () => getProjectWorkspaceRequest(accessToken, projectId),
  })

  const ws      = workspaceQ.data?.data
  const project = ws?.project ?? projectMeta

  const boardColumns = useMemo(() => {
    const cols = ws?.board.columns ?? []
    const sorted = [...cols].sort((a, b) => a.position - b.position)
    return isClient ? sorted.filter((c) => c.isClientVisible) : sorted
  }, [ws, isClient])

  const boardTasks = useMemo(() => {
    const tasks = ws?.board.tasks ?? []
    return isClient ? tasks.filter((t) => t.isClientVisible) : tasks
  }, [ws, isClient])

  const tasksByColumn = useMemo(() => {
    const map: Record<string, ProjectTask[]> = {}
    for (const col of boardColumns) map[col.id] = []
    for (const task of boardTasks) {
      if (!map[task.columnId]) map[task.columnId] = []
      map[task.columnId].push(task)
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0))
    }
    return map
  }, [boardColumns, boardTasks])

  const moveTask = useMutation({
    mutationFn: ({ taskId, targetColumnId, position }: { taskId: string; targetColumnId: string; position: number }) =>
      patchTaskRequest(accessToken, taskId, { column_id: targetColumnId, position }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectWorkspace(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
    },
    onError: (e) => parseApiError(e).then((m) => setErrorMsg(m || 'No se pudo mover la tarea')),
  })

  const type   = project?.type ? { bg: '', text: '' } : null
  const status = project?.status ? PARENT_COLUMNS.find((c) => c.key === project.status) : null
  const pct    = project?.progressPercent ?? 0

  return (
    <div className="flex flex-col gap-5 min-h-0">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} aria-label="Volver al tablero de proyectos"
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Proyectos
          </Button>
        </div>

        <div className="rounded-xl border bg-card shadow-sm px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <h1 className="text-base font-bold truncate leading-tight">{project?.name ?? '…'}</h1>
                {project?.type && (
                  <ProjectTypeBadge type={project.type} className="hidden sm:inline-flex" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {status && project && (
                  <span className="flex items-center gap-1">
                    <span className={`size-1.5 rounded-full ${STATUS_DOT[project.status]}`} aria-hidden="true" />
                    {status.label}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="size-3" aria-hidden="true" />
                  <span className="truncate max-w-[140px]">{project?.clientName ?? '…'}</span>
                </span>
              </div>
            </div>
            {project && (
              <div className="flex items-center gap-2 shrink-0" role="progressbar"
                aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso: ${pct}%`}>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold leading-none">{pct}%</span>
                  <div className="w-20 sm:w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-row items-center gap-0.5 border-b overflow-x-auto" role="tablist" aria-label="Secciones del proyecto">
        {TABS.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value}
            aria-controls={`tabpanel-${tab.value}`} onClick={() => setActiveTab(tab.value)}
            className={[
              'flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-md whitespace-nowrap shrink-0',
              activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            ].join(' ')}>
            <span aria-hidden="true">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-1">
        {activeTab === 'board' && (
          <div id="tabpanel-board" role="tabpanel" aria-label="Tablero de tareas">
            <TaskBoard
              accessToken={accessToken}
              projectId={projectId}
              columns={boardColumns}
              tasksByColumn={tasksByColumn}
              identity={identity}
              members={ws?.members ?? []}
              canOperate={canOperate}
              isLoading={workspaceQ.isLoading}
              onMoveTask={(taskId, targetColumnId) =>
                moveTask.mutate({ taskId, targetColumnId, position: (tasksByColumn[targetColumnId] ?? []).length })
              }
              onTaskSaved={() => {
                void queryClient.invalidateQueries({ queryKey: collabKeys.projectWorkspace(projectId) })
                void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
              }}
              onError={setErrorMsg}
            />
          </div>
        )}
        {activeTab === 'chat' && (
          <div id="tabpanel-chat" role="tabpanel">
            <ChatPanel accessToken={accessToken} projectId={projectId} identity={identity}
              isClient={isClient} onError={setErrorMsg} />
          </div>
        )}
        {activeTab === 'files' && (
          <div id="tabpanel-files" role="tabpanel">
            <ProjectFiles accessToken={accessToken} projectId={projectId} />
          </div>
        )}
        {activeTab === 'brief' && (
          <div id="tabpanel-brief" role="tabpanel">
            <BriefPanel brief={ws?.brief ?? null} formalChanges={ws?.formalChanges ?? []}
              isLoading={workspaceQ.isLoading} />
          </div>
        )}
        {activeTab === 'members' && (
          <div id="tabpanel-members" role="tabpanel">
            <ProjectMembers members={ws?.members ?? []} isLoading={workspaceQ.isLoading} />
          </div>
        )}
      </div>
    </div>
  )
}
