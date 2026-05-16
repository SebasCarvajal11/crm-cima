/**
 * Panel de Colaboracion — entry point del modulo kanban.
 * Renderiza el tablero padre (proyectos) o el workspace hijo (proyecto abierto).
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { listProjectsRequest, searchProjectsRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import { PARENT_COLUMNS } from './collab/collab.config'
import { ProjectCard } from './collab/project-card'
import { ProjectWorkspace } from './collab/project-workspace'
import { CreateProjectModal } from './collab/create-project-modal'
import type { ProjectListItem, ParentProjectStatus } from '@/features/collab/model'
import type { MeResponse } from '@/shared/types'

/** Alto del area con scroll por columna del tablero padre (px). Solo tablero de proyectos. */
const PARENT_BOARD_COLUMN_BODY_HEIGHT_PX = 620

type Props = {
  accessToken: string
  identity: MeResponse['data']
  /** Proyectos precargados desde el BFF /bff/dashboard (opcional). */
  initialProjects?: ProjectListItem[]
  initialOpenProjectId?: string
  initialWorkspaceTab?: 'board' | 'chat' | 'brief' | 'members'
  initialOpenChannel?: 'internal' | 'external'
  initialOpenMessageId?: string
}

/** Organismo raiz del panel de colaboracion. Gestiona la navegacion entre tablero padre y workspace. */
export function CollabPanel({ accessToken, identity, initialProjects, initialOpenProjectId, initialWorkspaceTab, initialOpenChannel, initialOpenMessageId }: Props) {
  const [openProjectId, setOpenProjectId] = useState<string | null>(initialOpenProjectId ?? null)
  const [showModal,     setShowModal]     = useState(false)
  const [projectSearchText, setProjectSearchText] = useState('')
  const [projectSearchDebounced, setProjectSearchDebounced] = useState('')
  const navigate = useNavigate({ from: '/dashboard' })

  const canCreate = identity.role === 'admin'
  const canSearchByClient = identity.role === 'admin' || identity.role === 'worker'

  const projectsQ = useQuery({
    queryKey: collabKeys.projects(),
    queryFn:  () => listProjectsRequest(accessToken, { page: 1, limit: 100 }),
    initialData: initialProjects ? { data: { items: initialProjects, page: 1, limit: initialProjects.length || 1, total: initialProjects.length, total_pages: 1 } } : undefined,
  })
  const projects = useMemo(() => projectsQ.data?.data.items ?? [], [projectsQ.data])

  useEffect(() => {
    const t = window.setTimeout(() => setProjectSearchDebounced(projectSearchText.trim()), 180)
    return () => window.clearTimeout(t)
  }, [projectSearchText])

  const projectSearchQ = useQuery({
    queryKey: [...collabKeys.projects(), 'search', identity.role, projectSearchDebounced],
    queryFn: () => searchProjectsRequest(accessToken, { q: projectSearchDebounced, limit: 8 }),
    enabled: projectSearchDebounced.length >= 2,
    staleTime: 20_000,
  })

  useEffect(() => {
    navigate({
      to: '/dashboard',
      search: (prev) => ({
        ...prev,
        tab: 'collab',
        project_id: openProjectId ?? undefined,
        workspace_tab: openProjectId ? prev.workspace_tab : undefined,
      }),
      replace: true,
    })
  }, [navigate, openProjectId])

  const grouped = useMemo(() => {
    const map: Record<ParentProjectStatus, ProjectListItem[]> = {
      todo: [], in_progress: [], in_review: [], completed: [],
    }
    for (const p of projects) map[p.status]?.push(p)
    for (const col of Object.keys(map) as ParentProjectStatus[]) {
      map[col].sort((a, b) => a.progressPercent - b.progressPercent)
    }
    return map
  }, [projects])

  if (openProjectId) {
    return (
      <ProjectWorkspace
        accessToken={accessToken}
        identity={identity}
        projectId={openProjectId}
        projectMeta={projects.find((p) => p.id === openProjectId) ?? null}
        initialWorkspaceTab={initialWorkspaceTab}
        initialChatChannel={initialOpenChannel}
        initialChatMessageId={initialOpenMessageId}
        onBack={() => setOpenProjectId(null)}
      />
    )
  }

  const total     = projects.length
  const active    = grouped.in_progress.length
  const reviewing = grouped.in_review.length
  const done      = grouped.completed.length

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tablero de Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vista Kanban por estado — haz clic en un proyecto para abrir su workspace
          </p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
          {canCreate && (
            <Button size="sm" className="shrink-0 self-start sm:self-auto" onClick={() => setShowModal(true)}>
              <Plus className="size-4 mr-1.5" />
              Nuevo proyecto
            </Button>
          )}
          <div className="relative w-full sm:w-[350px]">
            <Input
              value={projectSearchText}
              onChange={(e) => setProjectSearchText(e.target.value)}
              placeholder={canSearchByClient ? 'Buscar por proyecto, cliente o correo' : 'Buscar proyecto'}
              aria-label="Buscar proyectos"
            />
            {projectSearchDebounced.length >= 2 && (
              <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md">
                {projectSearchQ.isLoading && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Buscando proyectos...</p>
                )}
                {!projectSearchQ.isLoading && (projectSearchQ.data?.data?.length ?? 0) === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                )}
                {!projectSearchQ.isLoading &&
                  (projectSearchQ.data?.data ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                      onClick={() => {
                        setProjectSearchText('')
                        setProjectSearchDebounced('')
                        setOpenProjectId(p.id)
                      }}
                    >
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {canSearchByClient
                          ? `${p.clientName}${p.clientEmail ? ` - ${p.clientEmail}` : ''}`
                          : p.clientName}
                      </p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {canCreate && (
        <CreateProjectModal
          accessToken={accessToken}
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreated={(id) => { setShowModal(false); setOpenProjectId(id) }}
        />
      )}

      {!projectsQ.isLoading && total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="region" aria-label="Resumen de proyectos">
          {[
            { label: 'Total',       value: total,     color: 'text-foreground',  dot: 'bg-foreground/30' },
            { label: 'En Curso',    value: active,    color: 'text-blue-600',    dot: 'bg-blue-500' },
            { label: 'En Revision', value: reviewing, color: 'text-amber-600',   dot: 'bg-amber-500' },
            { label: 'Completados', value: done,      color: 'text-emerald-600', dot: 'bg-emerald-500' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
              <span className={`size-2.5 rounded-full shrink-0 ${s.dot}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {projectsQ.isLoading && (
        <div className="flex justify-center items-center py-24" role="status" aria-label="Cargando proyectos">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
        </div>
      )}

      {!projectsQ.isLoading && (
        <div className="overflow-x-auto">
          <div
            className="grid grid-cols-4 gap-4 min-w-[900px]"
            role="main"
            aria-label="Tablero Kanban de proyectos"
          >
            {PARENT_COLUMNS.map((col) => {
              const colProjects = grouped[col.key] ?? []
              return (
                <section
                  key={col.key}
                  className={`flex flex-col rounded-xl border border-border border-t-4 ${col.accent} bg-card shadow-sm overflow-hidden`}
                  aria-label={`${col.label}: ${colProjects.length} proyecto${colProjects.length !== 1 ? 's' : ''}`}
                >
                  <div className={`${col.headerBg} flex items-center justify-between gap-2 px-3 py-2.5`}>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground" aria-hidden="true">{col.icon}</span>
                      <h2 className="text-sm font-semibold">{col.label}</h2>
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold min-w-[1.5rem] justify-center"
                      aria-label={`${colProjects.length} proyectos`}>
                      {colProjects.length}
                    </Badge>
                  </div>
                  <Separator />
                  <div
                    className="overflow-y-auto flex flex-col gap-2 p-2.5"
                    style={{ height: `${PARENT_BOARD_COLUMN_BODY_HEIGHT_PX}px` }}
                    aria-label={`Proyectos en ${col.label}`}
                  >
                    {colProjects.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-muted-foreground text-center opacity-50">{col.emptyText}</p>
                      </div>
                    ) : (
                      colProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onClick={() => setOpenProjectId(project.id)}
                        />
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}




