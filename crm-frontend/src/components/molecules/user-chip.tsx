import { User, X } from 'lucide-react'

type Props = {
  email: string
  onRemove?: () => void
  role?: string
}

/** Molecula: chip compacto que muestra el email de un usuario con opcion de eliminar. */
export function UserChip({ email, onRemove, role }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1 border">
      <User className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[160px]">{email}</span>
      {role && (
        <span className="text-[9px] text-muted-foreground font-medium ml-0.5">({role})</span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Quitar ${email}`}
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive ml-0.5 flex-shrink-0 transition-colors"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
