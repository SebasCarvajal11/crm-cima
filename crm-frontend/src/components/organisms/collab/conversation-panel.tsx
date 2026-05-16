import { useProjectTimeline } from '@/features/collab/hooks'
import { ChatPanel } from './chat-panel'
import { ConversationFilesTimeline } from './conversation-files-timeline'
import { ConversationUploadForm } from './conversation-upload-form'
import type { MeResponse } from '@/shared/types'
import type { ProjectMember, ProjectTask } from '@/features/collab/model'

type Props = {
  accessToken: string
  projectId: string
  identity: MeResponse['data']
  isClient: boolean
  initialChannel?: 'internal' | 'external'
  initialMessageId?: string
  members: ProjectMember[]
  tasks: ProjectTask[]
  onError: (msg: string) => void
}

export function ConversationPanel({ accessToken, projectId, identity, isClient, initialChannel, initialMessageId, members, tasks, onError }: Props) {
  const canManageFiles = identity.role === 'admin' || identity.role === 'worker'

  const { timelineQ, timeline } = useProjectTimeline({ accessToken, projectId })

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.8fr)_minmax(280px,0.95fr)]">
      <div className="min-w-0">
        <ChatPanel key={`${initialChannel ?? 'external'}:${initialMessageId ?? ''}`} accessToken={accessToken} projectId={projectId} identity={identity} isClient={isClient} initialChannel={initialChannel} initialMessageId={initialMessageId} members={members} onError={onError} />
      </div>

      <section className="flex h-[min(600px,70vh)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Archivos</h3>
          <p className="text-xs text-muted-foreground">Sube archivos con informacion minima y visibilidad para cliente.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {canManageFiles ? (
            <ConversationUploadForm accessToken={accessToken} projectId={projectId} onError={onError} />
          ) : (
            <p className="text-sm text-muted-foreground">Solo administradores y trabajadores pueden subir archivos.</p>
          )}
        </div>
      </section>

      <section className="flex h-[min(600px,70vh)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Trazabilidad</h3>
          <p className="text-xs text-muted-foreground">Linea del tiempo de archivos, tareas finalizadas y cambios aceptados.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {timelineQ.isLoading && <p className="text-sm text-muted-foreground">Cargando trazabilidad...</p>}
          {!timelineQ.isLoading && <ConversationFilesTimeline accessToken={accessToken} projectId={projectId} timeline={timeline} tasks={tasks} members={members} canManage={canManageFiles} onError={onError} />}
        </div>
      </section>
    </div>
  )
}



