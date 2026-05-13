import { useQuery } from '@tanstack/react-query'
import { listProjectFilesTimelineRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { ChatPanel } from './chat-panel'
import { ConversationFilesTimeline } from './conversation-files-timeline'
import { ConversationUploadForm } from './conversation-upload-form'
import type { MeResponse } from '@/auth/auth.types'
import type { ProjectFileEnriched, ProjectMember, ProjectTask } from '@/collab/collab.types'

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

  const filesQ = useQuery({
    queryKey: [...collabKeys.files(projectId), 'timeline'],
    queryFn: () => listProjectFilesTimelineRequest(accessToken, projectId),
  })
  const files = (filesQ.data?.data ?? []) as ProjectFileEnriched[]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="min-w-0">
        <ChatPanel accessToken={accessToken} projectId={projectId} identity={identity} isClient={isClient} initialChannel={initialChannel} initialMessageId={initialMessageId} members={members} onError={onError} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Archivos y Trazabilidad</h3>
          <p className="text-xs text-muted-foreground">Linea de tiempo cronologica de entregables y adjuntos del proyecto.</p>
        </div>

        {canManageFiles && <ConversationUploadForm accessToken={accessToken} projectId={projectId} tasks={tasks} onError={onError} />}

        {filesQ.isLoading && <p className="text-sm text-muted-foreground">Cargando trazabilidad...</p>}
        {!filesQ.isLoading && <ConversationFilesTimeline accessToken={accessToken} projectId={projectId} files={files} tasks={tasks} canManage={canManageFiles} onError={onError} />}
      </div>
    </div>
  )
}
