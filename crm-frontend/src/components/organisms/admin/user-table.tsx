import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionIntro } from '@/components/molecules/section-intro'
import { AdminUserActions } from './user-actions'
import {
  useAdminUsersTable,
  userDisplayName,
  userSecondaryName,
} from '@/features/admin/hooks'
import type { AdminUserRow, UserRole } from '@/features/admin/model'

type Props = {
  accessToken: string
}

function roleBadge(role: UserRole) {
  if (role === 'admin') return <Badge className="inline-flex min-w-[108px] justify-center rounded-full bg-indigo-100 text-indigo-800 border-indigo-200">Admin</Badge>
  if (role === 'worker') return <Badge className="inline-flex min-w-[108px] justify-center rounded-full bg-cyan-100 text-cyan-800 border-cyan-200">Trabajador</Badge>
  return <Badge className="inline-flex min-w-[108px] justify-center rounded-full bg-emerald-100 text-emerald-800 border-emerald-200">Cliente</Badge>
}

/** Organismo: tabla paginada de usuarios con filtros y acciones de administracion. */
export function AdminUserTable({ accessToken }: Props) {
  const {
    actionsError,
    actionsMessage,
    filteredItems,
    includeDeleted,
    items,
    pageSafe,
    pageWindow,
    patchFlags,
    patchStatus,
    restore,
    roleFilter,
    search,
    setActionsMessage,
    setIncludeDeleted,
    setPage,
    setRoleFilter,
    setSearch,
    softDelete,
    totalPages,
    usersQ,
  } = useAdminUsersTable(accessToken)

  return (
    <section className="space-y-4">
      <SectionIntro title="Usuarios" description="Gestion de cuentas con filtros, busqueda y acciones administrativas." />
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20">
          <div>
            <CardTitle className="text-base tracking-tight">Filtros</CardTitle>
            <CardDescription>Busca por nombre, apellido, empresa o correo; combina con rol y estado.</CardDescription>
          </div>
          <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="admin-search" className="text-xs text-muted-foreground">Busqueda</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="admin-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="h-11 w-full pl-9"
                  aria-label="Buscar por nombre, empresa, apellido o correo"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-role-filter" className="text-xs text-muted-foreground">Rol</Label>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as 'all' | UserRole); setPage(1) }}>
                <SelectTrigger id="admin-role-filter" className="h-11 min-h-11 max-h-11 w-full py-0 text-sm">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="worker">Trabajador</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-include-deleted" className="text-xs text-muted-foreground">Archivados</Label>
              <div className="flex h-11 w-full items-center rounded-md border bg-background px-3">
                <div className="flex items-center gap-2 text-sm leading-none">
                  <Checkbox
                    id="admin-include-deleted"
                    checked={includeDeleted}
                    onCheckedChange={(checked) => { setIncludeDeleted(checked === true); setPage(1) }}
                  />
                  <Label htmlFor="admin-include-deleted" className="cursor-pointer text-sm font-medium leading-none">Incluir archivados</Label>
                </div>
              </div>
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
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
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
              <div className="overflow-x-auto rounded-lg border border-border/80">
                <Table>
                  <caption className="sr-only">Listado de usuarios administrables.</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[260px]">Usuario</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead className="w-[130px] text-center">Rol</TableHead>
                      <TableHead className="w-[130px] text-center">Estado</TableHead>
                      <TableHead className="w-[430px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row: AdminUserRow) => (
                      <TableRow key={row.id} className="align-middle">
                        <TableCell className="min-w-[220px]">
                          <div className="flex flex-col">
                            <span className="font-semibold leading-tight">{userDisplayName(row)}</span>
                            {userSecondaryName(row) && (
                              <span className="mt-0.5 text-xs text-muted-foreground">{userSecondaryName(row)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm break-all">{row.email}</TableCell>
                        <TableCell className="text-center">{roleBadge(row.role)}</TableCell>
                        <TableCell className="text-center">
                          {row.deleted_at ? (
                            <Badge variant="destructive" className="inline-flex min-w-[108px] justify-center rounded-full">Archivado</Badge>
                          ) : row.is_active ? (
                            <Badge className="inline-flex min-w-[108px] justify-center rounded-full bg-emerald-100 text-emerald-800 border-emerald-200">Activo</Badge>
                          ) : (
                            <Badge variant="outline" className="inline-flex min-w-[108px] justify-center rounded-full">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <AdminUserActions
                            row={row}
                            patchStatus={patchStatus}
                            patchFlags={patchFlags}
                            softDelete={softDelete}
                            restore={restore}
                            clearActionMessage={() => setActionsMessage(null)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Pagina {pageSafe} de {Math.max(totalPages, 1)} - {filteredItems.length} registros
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Pagina anterior"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  {pageWindow.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={pageNumber === pageSafe ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2"
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Pagina siguiente"
                    disabled={totalPages === 0 || pageSafe >= totalPages}
                    onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p))}
                  >
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
