import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createProjectFileMetadataRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { uploadDocumentRequest } from '@/media/media-api'
import { isBlockedByExtension, SAFE_FILE_ACCEPT } from '@/media/file-security'

type Props = {
  accessToken: string
  projectId: string
  onError: (msg: string) => void
}

const MAX_FILE_BYTES = 25 * 1024 * 1024

export function ConversationUploadForm({ accessToken, projectId, onError }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clientVisible, setClientVisible] = useState(true)

  const upload = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Debes seleccionar un archivo')
      if (isBlockedByExtension(selectedFile.name)) throw new Error('Tipo de archivo bloqueado por seguridad')
      if (selectedFile.size > MAX_FILE_BYTES) throw new Error('El archivo supera el limite de 25 MB')
      return uploadDocumentRequest(accessToken, selectedFile).then((mediaRes) =>
        createProjectFileMetadataRequest(accessToken, projectId, {
          fileName: selectedFile.name,
          title: title.trim(),
          description: description.trim() || null,
          storagePath: mediaRes.data.objectKey,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: selectedFile.size,
          isClientVisible: clientVisible,
          origin: clientVisible ? 'external_chat' : 'internal_chat',
        }).then(() => ({ ok: true }))
      )
    },
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      void queryClient.invalidateQueries({ queryKey: collabKeys.timeline(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.files(projectId) })
    },
    onError: (e) => onError(e instanceof Error ? e.message : 'No se pudo subir el archivo'),
  })

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
      <div className="space-y-1">
        <Label htmlFor="conv-file-title">Titulo</Label>
        <Input id="conv-file-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Brief v2 aprobado" />
      </div>
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion opcional del archivo" />
      <div className="space-y-1">
        <Input
          type="file"
          accept={SAFE_FILE_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            if (file && isBlockedByExtension(file.name)) {
              onError('Tipo de archivo bloqueado por seguridad')
              setSelectedFile(null)
              e.currentTarget.value = ''
              return
            }
            setSelectedFile(file)
          }}
        />
        <p className="text-[11px] text-muted-foreground">Tamano maximo permitido: 25 MB.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={clientVisible} onCheckedChange={(v) => setClientVisible(v === true)} />
          Visible para cliente
        </label>
      </div>
      <Button type="button" onClick={() => upload.mutate()} disabled={upload.isPending || !selectedFile || title.trim().length < 2} className="gap-2">
        <Upload className="size-4" />
        {upload.isPending ? 'Subiendo...' : 'Subir archivo'}
      </Button>
    </div>
  )
}
