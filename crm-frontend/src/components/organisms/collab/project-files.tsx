import { useQuery } from '@tanstack/react-query'
import { Download, FolderOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getFileDownloadUrl, listProjectFilesEnrichedRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectFileEnriched } from '@/collab/collab.types'

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  accessToken: string
  projectId: string
}

/** Organismo: tabla de archivos del proyecto con informacion enriquecida de tarea y fase. */
export function ProjectFiles({ accessToken, projectId }: Props) {
  const filesQ = useQuery({
    queryKey: collabKeys.files(projectId),
    queryFn:  () => listProjectFilesEnrichedRequest(accessToken, projectId),
  })
  const files = (filesQ.data?.data ?? []) as ProjectFileEnriched[]

  if (filesQ.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground rounded-xl border">
        <FolderOpen className="size-12 opacity-20" aria-hidden="true" />
        <p className="font-semibold">Sin archivos</p>
        <p className="text-sm text-center max-w-xs">Los archivos adjuntos a tareas apareceran aqui.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Archivo</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Tarea</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Fase actual</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Subido por</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Fecha</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {files.map((f) => (
            <tr key={f.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-[160px]">{f.title ?? f.fileName}</p>
                {f.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {f.mimeType} · {fmtSize(f.sizeBytes)}
                </p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground">{f.taskTitle ?? '—'}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {f.currentColumnTitle
                  ? <Badge variant="secondary" className="text-[10px]">{f.currentColumnTitle}</Badge>
                  : <span className="text-xs text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                  {f.createdByEmail ?? '—'}
                </span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">
                  {new Date(f.createdAt).toLocaleDateString('es', { dateStyle: 'short' })}
                </span>
              </td>
              <td className="px-4 py-3">
                <a
                  href={getFileDownloadUrl(accessToken, f.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-muted transition-colors inline-flex"
                  aria-label={`Descargar ${f.fileName}`}
                >
                  <Download className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
