import { CalendarClock, CheckCircle2, Download, Eye, File as FileIconBase, FileImage, FileText, FileVideo, GitPullRequestArrow, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProjectMember, ProjectTask, ProjectTimelineItem } from '@/features/collab/model'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  accessToken: string
  projectId: string
  timeline: ProjectTimelineItem[]
  tasks: ProjectTask[]
  members?: ProjectMember[]
  canManage: boolean
  onError: (msg: string) => void
}

const fileIcon = (mimeType: string) =>
  mimeType.startsWith('image/')
    ? FileImage
    : mimeType.startsWith('video/')
      ? FileVideo
      : mimeType.includes('pdf') || mimeType.startsWith('text/')
        ? FileText
        : FileIconBase

const itemIcon = (item: ProjectTimelineItem) => {
  if (item.kind === 'task_completed') return CheckCircle2
  if (item.kind === 'change_accepted') return GitPullRequestArrow
  return fileIcon(item.mimeType ?? 'application/octet-stream')
}

const supportsPreview = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType === 'application/pdf' || mimeType.startsWith('text/')

const formatBogotaDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  })

const badgeClassByKind: Record<ProjectTimelineItem['kind'], string> = {
  file: 'bg-sky-100 text-sky-800 border-sky-200',
  task_completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  change_accepted: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function ConversationFilesTimeline({ accessToken, timeline, tasks, members = [], onError }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | ProjectTimelineItem['kind']>('all')
  const [preview, setPreview] = useState<{ open: boolean; url: string | null; mime: string; fileName: string }>({
    open: false,
    url: null,
    mime: '',
    fileName: '',
  })

  const emailBySub = useMemo(
    () => new Map(
      members
        .map((m) => [m.userSub, m.email] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    ),
    [members]
  )
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task] as const)), [tasks])
  const filteredTimeline = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    return timeline.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false
      if (!needle) return true
      const actorEmail = item.createdByEmail ?? (item.createdBySub ? emailBySub.get(item.createdBySub) : '') ?? ''
      const haystack = `${item.title} ${item.fileName ?? ''} ${actorEmail}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [timeline, kindFilter, searchText, emailBySub])

  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay eventos registrados para este proyecto.</p>
  }

  const openPreview = async (fileId: string, fileName: string) => {
    const key = `${fileId}:preview`
    try {
      setBusyKey(key)
      const res = await fetch(`/api/files/${fileId}/download?preview=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`No se pudo previsualizar (${res.status})`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      setImageZoom(1)
      setPreview({
        open: true,
        url: objectUrl,
        mime: blob.type || 'application/octet-stream',
        fileName,
      })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo previsualizar el archivo')
    } finally {
      setBusyKey(null)
    }
  }

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setImageZoom(1)
    setPreview({ open: false, url: null, mime: '', fileName: '' })
  }

  const openPreviewInNewTab = () => {
    if (!preview.url) return
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  const downloadPreviewFile = () => {
    if (!preview.url) return
    const link = document.createElement('a')
    link.href = preview.url
    link.download = preview.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadFile = async (fileId: string, fileName: string) => {
    const key = `${fileId}:download`
    try {
      setBusyKey(key)
      const res = await fetch(`/api/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`No se pudo descargar (${res.status})`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo descargar el archivo')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre o usuario"
            aria-label="Buscar en trazabilidad"
            className="h-8 text-xs"
          />
          <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as 'all' | ProjectTimelineItem['kind'])}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="file">Archivo</SelectItem>
              <SelectItem value="change_accepted">Cambio aceptado</SelectItem>
              <SelectItem value="task_completed">Tarea finalizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredTimeline.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay eventos que coincidan con la búsqueda o el filtro.</p>
        )}
        {filteredTimeline.map((item, index) => {
          const Icon = itemIcon(item)
          const isFile = item.kind === 'file' && !!item.fileId && !!item.fileName && !!item.mimeType
          const previewable = isFile ? supportsPreview(item.mimeType!) : false
          const linkedTask = item.taskId ? taskById.get(item.taskId) : null
          const actorEmail = item.createdByEmail ?? (item.createdBySub ? emailBySub.get(item.createdBySub) : null)
          const isLast = index === filteredTimeline.length - 1
          return (
            <article key={`${item.kind}:${item.id}`} className="relative pl-9">
              {!isLast && <span className="absolute left-[13px] top-8 bottom-[-0.85rem] w-px bg-border" aria-hidden="true" />}
              <span className="absolute left-0 top-1 inline-flex size-7 items-center justify-center rounded-full border bg-muted/40 text-primary shadow-sm">
                <Icon className="size-3.5" />
              </span>
              <div className="rounded-md border bg-background px-3 py-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5">
                      <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${badgeClassByKind[item.kind]}`}>
                        {item.label}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{item.title}</p>
                    {isFile && <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.fileName}</p>}
                    {item.kind === 'task_completed' && linkedTask && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Progreso final: {linkedTask.checklistProgress}%</p>
                    )}
                    <div className="mt-2.5 grid gap-1 text-[10px] text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5 leading-none">
                        <CalendarClock className="size-3" />
                        {formatBogotaDate(item.occurredAt)}
                      </p>
                      {actorEmail && (
                        <p className="inline-flex items-center gap-1.5 leading-none">
                          <UserRound className="size-3" />
                          {actorEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  {isFile && item.fileId && item.fileName && item.mimeType && (
                    <div className="flex shrink-0 items-center self-center">
                      <div className="flex min-w-[122px] flex-col items-stretch gap-1.5">
                        {previewable && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 w-full justify-center px-2 text-[10px]"
                            disabled={busyKey !== null}
                            onClick={() => void openPreview(item.fileId!, item.fileName!)}
                          >
                            <Eye className="mr-1 size-3" />
                            {busyKey === `${item.fileId}:preview` ? 'Abriendo...' : 'Previsualizar'}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 w-full justify-center px-2 text-[10px]"
                          disabled={busyKey !== null}
                          onClick={() => void downloadFile(item.fileId!, item.fileName!)}
                        >
                          <Download className="mr-1 size-3" />
                          {busyKey === `${item.fileId}:download` ? 'Descargando...' : 'Descargar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <Dialog open={preview.open} onOpenChange={(open) => { if (!open) closePreview() }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {preview.mime.startsWith('image/') && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))))}>-</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageZoom(1)}>{Math.round(imageZoom * 100)}%</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}>+</Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openPreviewInNewTab}>Abrir en pestaña</Button>
              <Button type="button" size="sm" onClick={downloadPreviewFile}>
                <Download className="mr-1 size-3.5" />
                Descargar
              </Button>
            </div>
          </div>
          <div className="max-h-[75vh] overflow-auto rounded-md border bg-muted/20 p-2">
            {preview.url && preview.mime.startsWith('image/') && (
              <img
                src={preview.url}
                alt={preview.fileName}
                className="mx-auto h-auto max-h-[70vh] w-auto rounded"
                style={{ transform: `scale(${imageZoom})`, transformOrigin: 'top center' }}
              />
            )}
            {preview.url && preview.mime === 'application/pdf' && (
              <iframe src={preview.url} title={preview.fileName} className="h-[70vh] w-full rounded border-0" />
            )}
            {preview.url && preview.mime.startsWith('video/') && (
              <video src={preview.url} controls className="mx-auto max-h-[70vh] w-auto max-w-full rounded" />
            )}
            {preview.url && preview.mime.startsWith('text/') && (
              <iframe src={preview.url} title={preview.fileName} className="h-[70vh] w-full rounded border-0" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

