import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionIntro } from '@/components/molecules/section-intro'
import { listSessionsRequest, revokeSessionRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'
import { authKeys } from '@/auth/query-keys'

type Props = {
  accessToken: string
}

const PAGE_SIZE = 2
const PAGE_BLOCK_SIZE = 5

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return date.toLocaleString()
}

/** Organismo: listado y revocacion de sesiones activas del usuario. */
export function SessionsSection({ accessToken }: Props) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const sessionsQ = useQuery({
    queryKey: [...authKeys.sessions(), accessToken],
    queryFn: () => listSessionsRequest(accessToken),
    enabled: Boolean(accessToken),
  })

  const sessions = useMemo(() => sessionsQ.data?.data.sessions ?? [], [sessionsQ.data])

  const revokeMutation = useMutation({
    mutationFn: async (familyId: string) => {
      try {
        return await revokeSessionRequest(accessToken, familyId)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  })

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      try {
        const allFamilies = sessions.map((session) => session.family)
        await Promise.all(allFamilies.map((familyId) => revokeSessionRequest(accessToken, familyId)))
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => {
      queryClient.clear()
      window.location.replace('/login')
    },
  })

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const pageStart = (pageSafe - 1) * PAGE_SIZE
  const pageSessions = sessions.slice(pageStart, pageStart + PAGE_SIZE)
  const pageWindow = useMemo(() => {
    const blockIndex = Math.floor((pageSafe - 1) / PAGE_BLOCK_SIZE)
    const start = blockIndex * PAGE_BLOCK_SIZE + 1
    const end = Math.min(start + PAGE_BLOCK_SIZE - 1, totalPages)
    const pages: number[] = []
    for (let p = start; p <= end; p += 1) pages.push(p)
    return pages
  }, [pageSafe, totalPages])

  return (
    <section className="space-y-4">
      <SectionIntro
        title="Sesiones activas"
        description="Cierra sesiones en otros dispositivos para proteger tu cuenta."
      />

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Dispositivos conectados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsQ.isLoading ? (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <p className="text-sm text-muted-foreground">Cargando sesiones activas...</p>
            </div>
          ) : sessionsQ.isError ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudieron cargar las sesiones</AlertTitle>
              <AlertDescription>Intenta recargar la pagina en unos segundos.</AlertDescription>
            </Alert>
          ) : sessions.length === 0 ? (
            <Alert>
              <AlertTitle>Sin sesiones registradas</AlertTitle>
              <AlertDescription>Cuando inicies sesion en nuevos dispositivos, apareceran aqui.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Pagina {pageSafe} de {totalPages} - {sessions.length} sesiones
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="default"
                      className="h-10 w-full sm:w-auto"
                      disabled={revokeAllMutation.isPending || revokeMutation.isPending}
                    >
                      {revokeAllMutation.isPending ? 'Cerrando sesiones...' : 'Cerrar sesion en todos los dispositivos'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cerrar sesion en todos los dispositivos</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta accion cerrara todas tus sesiones activas. Tendras que iniciar sesion de nuevo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revokeAllMutation.mutate()}>
                        Confirmar cierre global
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {pageSessions.map((session) => (
                <div
                  key={session.family}
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">
                      {session.device_label}
                      {session.is_current && (
                        <Badge className="ml-2 align-middle" variant="secondary">
                          Actual
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expira: {formatDateTime(session.expires_at)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ultima actividad: {formatDateTime(session.last_activity_at)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    aria-label={`Revocar sesion de ${session.device_label}`}
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(session.family)}
                  >
                    Revocar
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="size-4" />
                  <span className="sr-only">Anterior</span>
                </Button>
                {pageWindow.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant={pageNumber === pageSafe ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 min-w-9 px-3"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  <ChevronRight className="size-4" />
                  <span className="sr-only">Siguiente</span>
                </Button>
              </div>
            </div>
          )}

          {revokeMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo revocar la sesion</AlertTitle>
              <AlertDescription>{revokeMutation.error.message}</AlertDescription>
            </Alert>
          )}
          {revokeAllMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudieron cerrar todas las sesiones</AlertTitle>
              <AlertDescription>
                Ocurrio un error al cerrar sesiones en todos los dispositivos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
