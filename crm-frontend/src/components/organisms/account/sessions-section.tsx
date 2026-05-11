import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionIntro } from '@/components/molecules/section-intro'
import { listSessionsRequest, revokeSessionRequest } from '@/auth/auth-api'
import { authKeys } from '@/auth/query-keys'

type Props = {
  accessToken: string
}

/** Organismo: listado y revocacion de sesiones activas del usuario. */
export function SessionsSection({ accessToken }: Props) {
  const queryClient = useQueryClient()

  const sessionsQ = useQuery({
    queryKey: [...authKeys.sessions(), accessToken],
    queryFn:  () => listSessionsRequest(accessToken),
    enabled:  Boolean(accessToken),
  })

  const revokeMutation = useMutation({
    mutationFn: (familyId: string) => revokeSessionRequest(accessToken, familyId),
    onSuccess:  () => void queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  })

  return (
    <section className="space-y-4">
      <SectionIntro
        title="Sesiones activas"
        description="Cierra sesiones en otros dispositivos. La cookie de refresco actual puede invalidarse al revocar la sesion actual."
      />
      <Card>
        <CardContent className="pt-6">
          {sessionsQ.isLoading ? (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground">Cargando sesiones activas…</p>
            </div>
          ) : sessionsQ.isError ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudieron cargar las sesiones</AlertTitle>
              <AlertDescription>Intenta recargar la pagina en unos segundos.</AlertDescription>
            </Alert>
          ) : sessionsQ.data?.data.sessions.length === 0 ? (
            <Alert>
              <AlertTitle>Sin sesiones registradas</AlertTitle>
              <AlertDescription>Cuando inicies sesion en nuevos dispositivos, apareceran aqui.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <caption className="sr-only">Listado de sesiones activas.</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="w-[100px]"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsQ.data?.data.sessions.map((s) => (
                    <TableRow key={s.family}>
                      <TableCell>
                        {s.device_label}
                        {s.is_current && <Badge className="ml-2" variant="secondary">Actual</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.expires_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="sm"
                          aria-label={`Revocar sesion de ${s.device_label}`}
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(s.family)}>
                          Revocar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
