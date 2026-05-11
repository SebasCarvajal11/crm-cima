import { CheckCircle2, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type BriefData = {
  projectId: string
  content: string
  updatedBySub: string
  updatedAt: string
} | null

type FormalChange = {
  id: string
  status: string
  title: string
  createdAt: string
}

type Props = {
  brief: BriefData
  formalChanges: FormalChange[]
  isLoading: boolean
}

/** Organismo: panel de brief del proyecto y registro de cambios formales. */
export function BriefPanel({ brief, formalChanges, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16" role="status" aria-label="Cargando brief">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-xl border bg-card shadow-sm" role="region" aria-label="Brief del proyecto">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Brief del Proyecto</h3>
            {brief && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Actualizado:{' '}
                {new Date(brief.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
        <div className="p-5">
          {brief?.content ? (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {brief.content}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
              <FileText className="size-10 opacity-20" aria-hidden="true" />
              <p>Sin brief configurado para este proyecto.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm" role="region" aria-label="Historial de cambios formales">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">Cambios Formales</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Historial de modificaciones de alcance</p>
        </div>
        <div className="p-3">
          {formalChanges.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <CheckCircle2 className="size-8 opacity-20" aria-hidden="true" />
              <p className="text-sm">Sin cambios formales registrados.</p>
            </div>
          ) : (
            <ol className="space-y-2" aria-label="Lista de cambios formales">
              {formalChanges.map((fc) => (
                <li key={fc.id} className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium">{fc.title}</p>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <Badge variant="outline" className="text-[10px]">{fc.status}</Badge>
                    <time dateTime={fc.createdAt} className="text-[10px] text-muted-foreground">
                      {new Date(fc.createdAt).toLocaleDateString('es', { dateStyle: 'medium' })}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
