import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseApiError } from '@/auth/parse-api-error'
import {
  getFileDownloadUrl,
  listTaskFilesRequest,
  uploadTaskFileRequest,
} from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectFile } from '@/collab/collab.types'

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  accessToken: string
  projectId: string
  taskId: string
  canUpload: boolean
  onError: (msg: string) => void
}

/** Organismo: pestaña de archivos adjuntos de una tarea especifica. */
export function TaskFilesTab({ accessToken, projectId, taskId, canUpload, onError }: Props) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [fileTitle,     setFileTitle]     = useState('')
  const [fileDesc,      setFileDesc]      = useState('')
  const [selectedFile,  setSelectedFile]  = useState<File | null>(null)
  const [fileError,     setFileError]     = useState<string | null>(null)

  const filesQ = useQuery({
    queryKey: collabKeys.taskFiles(taskId),
    queryFn:  () => listTaskFilesRequest(accessToken, projectId, taskId),
  })
  const files = (filesQ.data?.data ?? []) as ProjectFile[]

  const upload = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No hay archivo seleccionado')
      return uploadTaskFileRequest(accessToken, projectId, taskId, selectedFile, fileTitle.trim(), fileDesc.trim(), false)
    },
    onSuccess: () => {
      setShowForm(false); setFileTitle(''); setFileDesc(''); setSelectedFile(null); setFileError(null)
      void queryClient.invalidateQueries({ queryKey: collabKeys.taskFiles(taskId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.files(projectId) })
    },
    onError: (e) => parseApiError(e).then((m) => {
      setFileError(m || 'No se pudo subir el archivo')
      onError(m || 'Error al subir archivo')
    }),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setFileError('El archivo supera el limite de 10 MB'); return }
    setFileError(null); setSelectedFile(file)
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Paperclip className="size-3.5 mr-1.5" />
          {showForm ? 'Cancelar' : 'Adjuntar archivo'}
        </Button>
      )}

      {showForm && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tf-title" className="text-xs">Titulo <span className="text-destructive">*</span></Label>
            <Input id="tf-title" placeholder="Nombre descriptivo del archivo" value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-desc" className="text-xs">Descripcion <span className="text-destructive">*</span></Label>
            <Textarea id="tf-desc" placeholder="Explica que contiene este archivo…" value={fileDesc}
              onChange={(e) => setFileDesc(e.target.value)} className="min-h-[60px] resize-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Archivo (max 10 MB) <span className="text-destructive">*</span></Label>
            <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} aria-label="Seleccionar archivo" />
            <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2 font-normal text-sm"
              onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
              {selectedFile ? selectedFile.name : 'Seleccionar archivo…'}
            </Button>
            {selectedFile && <p className="text-xs text-muted-foreground">{fmtSize(selectedFile.size)}</p>}
          </div>
          {fileError && <p className="text-xs text-destructive" role="alert">{fileError}</p>}
          <Button size="sm" className="w-full"
            disabled={!fileTitle.trim() || !fileDesc.trim() || !selectedFile || upload.isPending}
            onClick={() => upload.mutate()}>
            {upload.isPending ? 'Subiendo…' : 'Subir archivo'}
          </Button>
        </div>
      )}

      {filesQ.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin archivos adjuntos en esta tarea.</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="rounded-lg border bg-card px-3 py-2.5 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.title ?? f.fileName}</p>
                {f.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.description}</p>}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">{fmtSize(f.sizeBytes)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(f.createdAt).toLocaleDateString('es', { dateStyle: 'short' })}
                  </span>
                  {f.createdByEmail && (
                    <span className="text-[10px] text-muted-foreground truncate">{f.createdByEmail}</span>
                  )}
                </div>
              </div>
              <a
                href={getFileDownloadUrl(accessToken, f.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label={`Descargar ${f.fileName}`}
              >
                <Download className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
