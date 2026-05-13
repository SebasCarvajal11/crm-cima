import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uploadProjectConversationFileRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectTask } from '@/collab/collab.types'

type Props = {
  accessToken: string
  projectId: string
  tasks: ProjectTask[]
  onError: (msg: string) => void
}

export function ConversationUploadForm({ accessToken, projectId, tasks, onError }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskId, setTaskId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [internalChannel, setInternalChannel] = useState(false)
  const [clientVisible, setClientVisible] = useState(true)
  const orderedTasks = useMemo(() => [...tasks].sort((a, b) => a.title.localeCompare(b.title)), [tasks])

  const upload = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Debes seleccionar un archivo')
      return uploadProjectConversationFileRequest(accessToken, projectId, {
        file: selectedFile,
        title: title.trim(),
        description: description.trim(),
        taskId: taskId || null,
        isClientVisible: clientVisible,
        channel: internalChannel ? 'internal' : 'external',
      })
    },
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setTaskId('')
      setSelectedFile(null)
      void queryClient.invalidateQueries({ queryKey: [...collabKeys.files(projectId), 'timeline'] })
      void queryClient.invalidateQueries({ queryKey: collabKeys.files(projectId) })
    },
    onError: (e) => onError(e instanceof Error ? e.message : 'No se pudo subir el archivo'),
  })

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="conv-file-title">Titulo</Label>
          <Input id="conv-file-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Brief v2 aprobado" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="conv-file-task">Tarea asociada</Label>
          <select id="conv-file-task" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Sin tarea asociada</option>
            {orderedTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </div>
      </div>
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion opcional del archivo" />
      <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={clientVisible} onCheckedChange={(v) => setClientVisible(v === true)} />
          Visible para cliente
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={internalChannel} onCheckedChange={(v) => setInternalChannel(v === true)} />
          Canal interno
        </label>
      </div>
      <Button type="button" onClick={() => upload.mutate()} disabled={upload.isPending || !selectedFile || title.trim().length < 2} className="gap-2">
        <Upload className="size-4" />
        {upload.isPending ? 'Subiendo...' : 'Subir archivo'}
      </Button>
    </div>
  )
}

