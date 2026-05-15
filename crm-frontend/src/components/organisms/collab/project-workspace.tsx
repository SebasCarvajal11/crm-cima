import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, FileText, KanbanSquare, MessageSquare, User, Users } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProjectTypeBadge } from '@/components/molecules/project-type-badge'
import { parseApiError } from '@/auth/parse-api-error'
import {
  getBriefRequest,
  getProjectBoardRequest,
  listExternalChatRequest,
  listFormalChangeLogRequest,
  listInternalChatRequest,
  patchTaskRequest,
} from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { PARENT_COLUMNS, PRIORITY_WEIGHT, STATUS_DOT } from './collab.config'
import { TaskBoard } from './task-board'
import { ConversationPanel } from './conversation-panel'
import { BriefPanel } from './brief-panel'
import { ProjectMembers } from './project-members'
import type { Project, ProjectListItem, ProjectTask } from '@/collab/collab.types'
import type { MeResponse } from '@/auth/auth.types'

type WorkspaceTab = 'board' | 'chat' | 'brief' | 'members'

type Props = {
  accessToken: string
  identity: MeResponse['data']
  projectId: string
  projectMeta: Project | ProjectListItem | null
  initialWorkspaceTab?: WorkspaceTab
  initialChatChannel?: 'internal' | 'external'
  initialChatMessageId?: string
  onBack: () => void
}

const TABS: { value: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { value: 'board',   label: 'Tablero',      icon: <KanbanSquare  className="size-4" /> },
  { value: 'chat',    label: 'Conversacion', icon: <MessageSquare className="size-4" /> },
  { value: 'brief',   label: 'Brief',        icon: <FileText      className="size-4" /> },
  { value: 'members', label: 'Integrantes',  icon: <Users         className="size-4" /> },
]

const FINALIZATION_COLUMN_KEYS = new Set(['done', 'completed'])

/** Organismo: workspace de un proyecto (tablero hijo + tabs de conversacion, archivos y brief). */
export function ProjectWorkspace({ accessToken, identity, projectId, projectMeta, initialWorkspaceTab, initialChatChannel, initialChatMessageId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialWorkspaceTab ?? (initialChatChannel ? 'chat' : 'board'))
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)
  const [taskSearchText, setTaskSearchText] = useState('')
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: '/dashboard' })

  const isClient   = identity.role === 'client'
  const canOperate = identity.role === 'admin' || identity.role === 'worker'

  const boardQ = useQuery({
    queryKey: collabKeys.projectBoard(projectId),
    queryFn:  () => getProjectBoardRequest(accessToken, projectId),
    staleTime: 30_000,
  })
  const briefQ = useQuery({
    queryKey: [...collabKeys.brief(projectId), 'panel'],
    queryFn: async () => {
      const [briefRes, formalRes] = await Promise.all([
        getBriefRequest(accessToken, projectId),
        listFormalChangeLogRequest(accessToken, projectId),
      ])
      return {
        brief: briefRes.data ?? null,
        formalChanges: (formalRes.data.items ?? []).map((row) => ({
          id: row.id,
          title: row.description,
          status: 'approved',
          createdAt: row.createdAt,
        })),
      }
    },
    enabled: activeTab === 'brief',
    staleTime: 60_000,
  })

  const boardData = boardQ.data?.data
  const project = boardData?.project ?? projectMeta

  const boardColumns = useMemo(() => {
    const cols = boardData?.board.columns ?? []
    return cols.toSorted((a, b) => a.position - b.position)
  }, [boardData])

  const boardTasks = useMemo(() => {
    return boardData?.board.tasks ?? []
  }, [boardData])

  const members = boardData?.members ?? []

  const searchableTasks = useMemo(() => {
    const normalized = taskSearchText.trim().toLowerCase()
    if (normalized.length < 2) return []
    return boardTasks
      .filter((task) => {
        const columnTitle = boardColumns.find((c) => c.id === task.columnId)?.title ?? ''
        return [
          task.title,
          task.description ?? '',
          task.priority,
          columnTitle,
        ].join(' ').toLowerCase().includes(normalized)
      })
      .slice(0, 8)
  }, [boardColumns, boardTasks, taskSearchText])

  useEffect(() => {
    if (!initialWorkspaceTab) return
    setActiveTab(initialWorkspaceTab)
  }, [initialWorkspaceTab])

  useEffect(() => {
    navigate({
      to: '/dashboard',
      search: (prev) => ({
        ...prev,
        tab: 'collab',
        project_id: projectId,
        workspace_tab: activeTab,
      }),
      replace: true,
    })
  }, [navigate, projectId, activeTab])

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: collabKeys.chatExternal(projectId),
      queryFn: () => listExternalChatRequest(accessToken, projectId),
      staleTime: 15_000,
    })
    if (!isClient) {
      void queryClient.prefetchQuery({
        queryKey: collabKeys.chatInternal(projectId),
        queryFn: () => listInternalChatRequest(accessToken, projectId),
        staleTime: 15_000,
      })
    }

    void queryClient.prefetchQuery({
      queryKey: [...collabKeys.brief(projectId), 'panel'],
      queryFn: async () => {
        const [briefRes, formalRes] = await Promise.all([
          getBriefRequest(accessToken, projectId),
          listFormalChangeLogRequest(accessToken, projectId),
        ])
        return {
          brief: briefRes.data ?? null,
          formalChanges: (formalRes.data.items ?? []).map((row) => ({
            id: row.id,
            title: row.description,
            status: 'approved',
            createdAt: row.createdAt,
          })),
        }
      },
      staleTime: 60_000,
    })
  }, [accessToken, isClient, projectId, queryClient])

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
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
      void queryClient.invalidateQueries({ queryKey: collabKeys.timeline(projectId) })
    },
    onError: (e) => parseApiError(e).then((m) => setErrorMsg(m || 'No se pudo mover la tarea')),
  })

  const status = project?.status ? PARENT_COLUMNS.find((c) => c.key === project.status) : null
  const pct    = project?.progressPercent ?? 0

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} aria-label="Volver al tablero de proyectos"
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Proyectos
          </Button>
        </div>

        <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <h1 className="text-base font-semibold truncate leading-tight">{project?.name ?? '…'}</h1>
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
                  <span className="text-sm font-semibold leading-none">{pct}%</span>
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

      <div
        className="flex items-center gap-1 overflow-x-auto rounded-2xl border bg-card p-1 shadow-sm"
        role="tablist"
        aria-label="Secciones del proyecto"
      >
        {TABS.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value}
            aria-controls={`tabpanel-${tab.value}`} onClick={() => setActiveTab(tab.value)}
            className={[
              'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}>
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0">
        {activeTab === 'board' && (
          <div id="tabpanel-board" role="tabpanel" aria-label="Tablero de tareas">
            <div className="mb-4 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">Buscar tareas</h3>
                <p className="text-xs text-muted-foreground">Filtra por nombre, descripcion o columna del tablero.</p>
              </div>
              <div className="relative max-w-md">
                <Input
                  value={taskSearchText}
                  onChange={(e) => setTaskSearchText(e.target.value)}
                  placeholder="Buscar tareas por nombre, descripcion o columna"
                  aria-label="Buscar tareas del proyecto"
                />
                {taskSearchText.trim().length >= 2 && (
                  <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {searchableTasks.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Sin tareas coincidentes</p>
                    )}
                    {searchableTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className="w-full px-3 py-2 text-left transition-colors hover:bg-accent"
                        onClick={() => {
                          setTaskSearchText('')
                          setFocusedTaskId(task.id)
                        }}
                      >
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {boardColumns.find((c) => c.id === task.columnId)?.title ?? 'Sin columna'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <TaskBoard
              key={focusedTaskId ?? 'board-default'}
              accessToken={accessToken}
              projectId={projectId}
              columns={boardColumns}
              tasksByColumn={tasksByColumn}
              identity={identity}
              members={members}
              canOperate={canOperate}
              isLoading={boardQ.isLoading}
              onMoveTask={(taskId, targetColumnId) => {
                setErrorMsg(null)
                const task = boardTasks.find((item) => item.id === taskId)
                const targetColumn = boardColumns.find((column) => column.id === targetColumnId)
                const hasSubtasks = (task?.subtasks?.length ?? 0) > 0
                if (task && targetColumn && FINALIZATION_COLUMN_KEYS.has(targetColumn.key) && hasSubtasks && task.checklistProgress < 100) {
                  setErrorMsg('No puedes mover la tarea a la columna final sin completar todas las subtareas')
                  return
                }
                moveTask.mutate({ taskId, targetColumnId, position: (tasksByColumn[targetColumnId] ?? []).length })
              }}
              onTaskSaved={() => {
                void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
                void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
                void queryClient.invalidateQueries({ queryKey: collabKeys.timeline(projectId) })
              }}
              onError={setErrorMsg}
              focusedTaskId={focusedTaskId}
            />
          </div>
        )}
        {activeTab === 'chat' && (
          <div id="tabpanel-chat" role="tabpanel">
            <ConversationPanel
              accessToken={accessToken}
              projectId={projectId}
              identity={identity}
              isClient={isClient}
              initialChannel={initialChatChannel}
              initialMessageId={initialChatMessageId}
              members={members}
              tasks={boardTasks}
              onError={setErrorMsg}
            />
          </div>
        )}
        {activeTab === 'brief' && (
          <div id="tabpanel-brief" role="tabpanel">
            <BriefPanel
              brief={briefQ.data?.brief ?? null}
              formalChanges={briefQ.data?.formalChanges ?? []}
              isLoading={briefQ.isLoading}
            />
          </div>
        )}
        {activeTab === 'members' && (
          <div id="tabpanel-members" role="tabpanel">
            <ProjectMembers
              members={members}
              isLoading={boardQ.isLoading}
              accessToken={accessToken}
              projectId={projectId}
              identity={identity}
              canManageMembers={identity.role === 'admin'}
              onError={setErrorMsg}
            />
          </div>
        )}
      </div>
    </div>
  )
}
