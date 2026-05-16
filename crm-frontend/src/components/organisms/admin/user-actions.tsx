import { Button } from '@/components/ui/button'
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
import type { AdminUserRow } from '@/features/admin/model'

type MutationHandle<T> = {
  mutate: (arg: T) => void
  isPending: boolean
}

type Props = {
  row: AdminUserRow
  patchStatus: MutationHandle<{ subject: string; is_active: boolean }>
  patchFlags: MutationHandle<{ subject: string; force_password_change: boolean }>
  softDelete: MutationHandle<string>
  restore: MutationHandle<string>
  clearActionMessage: () => void
}

/** Organismo: acciones de administracion para una fila de usuario (activar, archivar, restaurar). */
export function AdminUserActions({ row, patchStatus, patchFlags, softDelete, restore, clearActionMessage }: Props) {
  const busy = patchStatus.isPending || patchFlags.isPending || softDelete.isPending || restore.isPending

  if (row.deleted_at) {
    return (
      <div className="flex justify-end">
      <Button type="button" variant="secondary" size="sm" className="h-8 w-[132px] justify-center px-3" disabled={busy}
        onClick={() => { clearActionMessage(); restore.mutate(row.id) }}>
        Restaurar
      </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:justify-items-end">
      <Button type="button" variant="outline" size="sm" className="h-8 w-[132px] justify-center whitespace-nowrap px-3" disabled={busy}
        onClick={() => { clearActionMessage(); patchStatus.mutate({ subject: row.id, is_active: !row.is_active }) }}>
        {row.is_active ? 'Desactivar' : 'Activar'}
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 w-[132px] justify-center whitespace-nowrap px-3" disabled={busy}
        onClick={() => { clearActionMessage(); patchFlags.mutate({ subject: row.id, force_password_change: !row.force_password_change }) }}>
        {row.force_password_change ? 'Quitar fuerza pwd' : 'Forzar cambio pwd'}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" className="h-8 w-[132px] justify-center whitespace-nowrap px-3" disabled={busy}>Archivar</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Se revocarán las sesiones activas. Puedes restaurar desde la vista con
              &quot;Incluir archivados&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearActionMessage(); softDelete.mutate(row.id) }}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


