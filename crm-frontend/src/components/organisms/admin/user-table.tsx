import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionIntro } from '@/components/molecules/section-intro'
import { AdminUserActions } from './user-actions'
import {
  adminListUsersRequest,
  adminPatchUserFlagsRequest,
  adminPatchUserStatusRequest,
  adminRestoreUserRequest,
  adminSoftDeleteUserRequest,
} from '@/auth/auth-api'
import { adminUsersKeys } from '@/auth/query-keys'
import { parseApiError } from '@/auth/parse-api-error'
import type { AdminUserRow, UserRole } from '@/auth/auth.types'

type Props = {
  accessToken: string
}

/** Organismo: tabla paginada de usuarios con filtros y acciones de administracion. */
export function AdminUserTable({ accessToken }: Props) {
  const queryClient = useQueryClient()
  const [page,           setPage]           = useState(1)
  const [roleFilter,     setRoleFilter]     = useState<'all' | UserRole>('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [actionsMessage, setActionsMessage] = useState<string | null>(null)
  const limit = 20

  const listParams = {
    page, limit,
    role:            roleFilter === 'all' ? undefined : roleFilter,
    include_deleted: includeDeleted || undefined,
  }

  const usersQ = useQuery({
    queryKey: adminUsersKeys.list(listParams),
    queryFn:  () => adminListUsersRequest(accessToken, listParams),
    enabled:  Boolean(accessToken),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: adminUsersKeys.all })

  const mkMutation = <T,>(fn: (arg: T) => Promise<{ message: string }>) =>
    useMutation({
      mutationFn: (arg: T) => fn(arg).catch(async (e) => { throw new Error(await parseApiError(e), { cause: e }) }),
      onSuccess:  (d) => { setActionsMessage(d.message); invalidate() },
      onError:    () => setActionsMessage(null),
    })

  const patchStatus = mkMutation(({ subject, is_active }: { subject: string; is_active: boolean }) =>
    adminPatchUserStatusRequest(accessToken, subject, { is_active }))
  const patchFlags = mkMutation(({ subject, force_password_change }: { subject: string; force_password_change: boolean }) =>
    adminPatchUserFlagsRequest(accessToken, subject, { force_password_change }))
  const softDelete = mkMutation((subject: string) => adminSoftDeleteUserRequest(accessToken, subject))
  const restore    = mkMutation((subject: string) => adminRestoreUserRequest(accessToken, subject))

  const data       = usersQ.data?.data
  const items      = data?.items ?? []
  const totalPages = data?.total_pages ?? 0
  const actionsError = patchStatus.error ?? patchFlags.error ?? softDelete.error ?? restore.error

  return (
    <section className="space-y-4">
      <SectionIntro title="Usuarios" description="Listado paginado de usuarios del sistema." />
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Filtra por rol o incluye cuentas archivadas.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="admin-role-filter" className="text-xs text-muted-foreground">Rol</Label>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as 'all' | UserRole); setPage(1) }}>
                <SelectTrigger id="admin-role-filter" className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="worker">Trabajador</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox id="admin-include-deleted" checked={includeDeleted}
                onCheckedChange={(c) => { setIncludeDeleted(c === true); setPage(1) }} />
              <Label htmlFor="admin-include-deleted" className="cursor-pointer font-normal">Incluir archivados</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionsError ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo completar la accion</AlertTitle>
              <AlertDescription>{(actionsError as Error).message}</AlertDescription>
            </Alert>
          ) : actionsMessage ? (
            <Alert>
              <AlertTitle>Accion realizada</AlertTitle>
              <AlertDescription>{actionsMessage}</AlertDescription>
            </Alert>
          ) : null}
          {usersQ.isLoading ? (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
              <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
            </div>
          ) : usersQ.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Error al cargar usuarios</AlertTitle>
              <AlertDescription>Reintenta en unos segundos.</AlertDescription>
            </Alert>
          ) : items.length === 0 ? (
            <Alert>
              <AlertTitle>Sin resultados</AlertTitle>
              <AlertDescription>No hay usuarios para los filtros seleccionados.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <caption className="sr-only">Listado de usuarios administrables.</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row: AdminUserRow) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell><Badge variant="outline">{row.role}</Badge></TableCell>
                        <TableCell>
                          {row.deleted_at ? (
                            <Badge variant="destructive">Archivado</Badge>
                          ) : row.is_active ? (
                            <Badge variant="secondary">Activo</Badge>
                          ) : (
                            <Badge>Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <AdminUserActions row={row} patchStatus={patchStatus} patchFlags={patchFlags}
                            softDelete={softDelete} restore={restore}
                            clearActionMessage={() => setActionsMessage(null)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Pagina {page} de {Math.max(totalPages, 1)} — {data?.total ?? 0} registros
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" aria-label="Pagina anterior"
                    disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" aria-label="Pagina siguiente"
                    disabled={totalPages === 0 || page >= totalPages}
                    onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p))}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
