import { useRef, useState } from 'react'
import { Download, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTaskFiles } from '@/features/collab/hooks'
import { downloadGatewayFile, formatFileSize } from '@/features/collab/utils'
import { isBlockedByExtension, SAFE_FILE_ACCEPT } from '@/features/media/utils'

const MAX_FILE_BYTES = 25 * 1024 * 1024

type Props = {
  accessToken: string
  projectId: string
  taskId: string
  canUpload: boolean
  onError: (msg: string) => void
}

/** Organismo: pestana de archivos adjuntos de una tarea especifica. */
export function TaskFilesTab({ accessToken, projectId, taskId, canUpload, onError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [fileTitle, setFileTitle] = useState('')
  const [fileDesc, setFileDesc] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [busyDownloadId, setBusyDownloadId] = useState<string | null>(null)

  const { filesQ, files, upload } = useTaskFiles({
    accessToken,
    projectId,
    taskId,
    onError,
    setFileError,
    resetForm: () => {
      setShowForm(false)
      setFileTitle('')
      setFileDesc('')
      setSelectedFile(null)
      setFileError(null)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (isBlockedByExtension(file.name)) {
      setFileError('Tipo de archivo bloqueado por seguridad')
      e.target.value = ''
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('El archivo supera el limite de 25 MB')
      e.target.value = ''
      setSelectedFile(null)
      return
    }
    setFileError(null)
    setSelectedFile(file)
  }

  const openDownload = async (fileId: string, fileName: string) => {
    try {
      setBusyDownloadId(fileId)
      await downloadGatewayFile(accessToken, fileId, fileName)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo descargar el archivo'
      onError(msg)
    } finally {
      setBusyDownloadId(null)
    }
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Paperclip className="mr-1.5 size-3.5" />
          {showForm ? 'Cancelar' : 'Adjuntar archivo'}
        </Button>
      )}

      {showForm && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="tf-title" className="text-xs">Titulo <span className="text-destructive">*</span></Label>
            <Input id="tf-title" placeholder="Nombre descriptivo del archivo" value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-desc" className="text-xs">Descripcion <span className="text-destructive">*</span></Label>
            <Textarea id="tf-desc" placeholder="Explica que contiene este archivo..." value={fileDesc}
              onChange={(e) => setFileDesc(e.target.value)} className="min-h-[60px] resize-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Archivo (max 25 MB) <span className="text-destructive">*</span></Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={SAFE_FILE_ACCEPT}
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Seleccionar archivo"
            />
            <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2 text-sm font-normal"
              onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
              {selectedFile ? selectedFile.name : 'Seleccionar archivo...'}
            </Button>
            {selectedFile && <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>}
          </div>
          {fileError && <p className="text-xs text-destructive" role="alert">{fileError}</p>}
          <Button size="sm" className="w-full"
            disabled={!fileTitle.trim() || !fileDesc.trim() || !selectedFile || upload.isPending}
            onClick={() => upload.mutate({ selectedFile, fileTitle, fileDesc })}>
            {upload.isPending ? 'Subiendo...' : 'Subir archivo'}
          </Button>
        </div>
      )}

      {filesQ.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : files.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin archivos adjuntos en esta tarea.</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.title ?? f.fileName}</p>
                {f.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(f.sizeBytes)}</span>
                  <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                    {new Date(f.createdAt).toLocaleDateString('es', { dateStyle: 'short' })}
                  </span>
                  {f.createdByEmail && (
                    <span className="truncate text-[10px] text-muted-foreground">{f.createdByEmail}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-muted"
                aria-label={`Descargar ${f.fileName}`}
                disabled={busyDownloadId !== null}
                onClick={() => void openDownload(f.id, f.fileName)}
              >
                <Download className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

