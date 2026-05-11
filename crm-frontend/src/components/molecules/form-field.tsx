import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  /** Debe incluir el mismo `id` que el control (Input/Textarea). */
  children: React.ReactNode
  className?: string
}

/** Molécula: etiqueta + control + error (el control repite `id` para accesibilidad). */
export function FormField({ id, label, error, hint, children, className }: FormFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  const control = React.isValidElement(children)
    ? React.cloneElement(
        children as React.ReactElement<{
          id?: string
          'aria-invalid'?: boolean
          'aria-describedby'?: string
        }>,
        {
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': describedBy || undefined,
        }
      )
    : children

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
