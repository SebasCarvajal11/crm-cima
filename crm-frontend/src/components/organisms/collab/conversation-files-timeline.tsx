import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, File, FileImage, FileText, FileVideo, Link2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteProjectFileRequest, updateProjectFileRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectFileEnriched, ProjectTask } from '@/collab/collab.types'

type Props = {
  accessToken: string
  projectId: string
  files: ProjectFileEnriched[]
  tasks: ProjectTask[]
  canManage: boolean
  onError: (msg: string) => void
}

const fileIcon = (mimeType: string) => mimeType.startsWith('image/') ? FileImage : mimeType.startsWith('video/') ? FileVideo : mimeType.includes('pdf') || mimeType.startsWith('text/') ? FileText : File
const formatDate = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const toDateInput = (d: string) => new Date(d).toISOString().slice(0, 10)

export function ConversationFilesTimeline({ accessToken, projectId, files, tasks, canManage, onError }: Props) {
  const queryClient = useQueryClient()
  const [channelFilter, setChannelFilter] = useState<'all' | 'internal' | 'external'>('all')
  const [taskFilter, setTaskFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTaskId, setEditTaskId] = useState('')

  const remove = useMutation({
    mutationFn: (fileId: string) => deleteProjectFileRequest(accessToken, fileId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [...collabKeys.files(projectId), 'timeline'] }),
    onError: (e) => onError(e instanceof Error ? e.message : 'No se pudo eliminar el archivo'),
  })
  const edit = useMutation({
    mutationFn: (fileId: string) => updateProjectFileRequest(accessToken, fileId, { title: editTitle.trim(), description: editDesc.trim() || null, task_id: editTaskId || null }),
    onSuccess: () => {
      setEditingId(null)
      void queryClient.invalidateQueries({ queryKey: [...collabKeys.files(projectId), 'timeline'] })
    },
    onError: (e) => onError(e instanceof Error ? e.message : 'No se pudo actualizar el archivo'),
  })

  const filtered = useMemo(() => files.filter((f) => {
    const originChannel = f.origin === 'internal_chat' ? 'internal' : 'external'
    const created = toDateInput(f.createdAt)
    return (channelFilter === 'all' || channelFilter === originChannel)
      && (taskFilter === 'all' || f.taskId === taskFilter)
      && (!fromDate || created >= fromDate)
      && (!toDate || created <= toDate)
  }), [files, channelFilter, taskFilter, fromDate, toDate])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as 'all' | 'internal' | 'external')}>
          <option value="all">Todos los canales</option>
          <option value="external">Canal cliente</option>
          <option value="internal">Canal interno</option>
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
          <option value="all">Todas las tareas</option>
          {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
        </select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No hay archivos para los filtros seleccionados.</p>}
        {filtered.map((item) => {
          const Icon = fileIcon(item.mimeType)
          return (
            <article key={item.id} className="relative pl-8 pb-6">
              <span className="absolute left-[9px] top-7 bottom-0 w-px bg-border" aria-hidden="true" />
              <span className="absolute left-0 top-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-3" /></span>
              <div className="rounded-lg border bg-background p-3 space-y-2">
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripcion" />
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editTaskId} onChange={(e) => setEditTaskId(e.target.value)}>
                      <option value="">Sin tarea asociada</option>
                      {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => edit.mutate(item.id)} disabled={edit.isPending}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold">{item.title ?? item.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.fileName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />{formatDate(item.createdAt)}</span>
                      <span className="inline-flex items-center gap-1"><FileText className="size-3.5" />{item.createdByEmail ?? 'Usuario'}</span>
                      <span className="inline-flex items-center gap-1"><Link2 className="size-3.5" />{item.taskTitle ?? 'Sin tarea ligada'}</span>
                    </div>
                    {canManage && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(item.id); setEditTitle(item.title ?? item.fileName); setEditDesc(item.description ?? ''); setEditTaskId(item.taskId ?? '') }} className="gap-1">
                          <Pencil className="size-3.5" />Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove.mutate(item.id)} disabled={remove.isPending} className="gap-1">
                          <Trash2 className="size-3.5" />Eliminar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

