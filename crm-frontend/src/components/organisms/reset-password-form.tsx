import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormField } from '@/components/molecules/form-field'
import { useResetPasswordFlow } from '@/features/auth/hooks'
import { strongPasswordSchema } from '@/features/auth/model'

const schema = z
  .object({
    password: strongPasswordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contrasenas no coinciden',
    path: ['confirm'],
  })

type Values = z.infer<typeof schema>

type ResetPasswordFormProps = {
  token: string | undefined
}

/** Organismo: nueva contrasena con token del enlace de recuperacion. */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const mutation = useResetPasswordFlow(token)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  })

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Enlace no valido</AlertTitle>
        <AlertDescription>
          Falta el parametro <code className="rounded bg-muted px-1">token</code> en la URL.
          Solicita un nuevo enlace desde recuperacion de contrasena.
        </AlertDescription>
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link to="/forgot-password">Solicitar enlace</Link>
        </Button>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate({ password: v.password }))} className="space-y-4">
      <FormField id="password" label="Nueva contrasena" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </FormField>
      <FormField id="confirm" label="Confirmar" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('confirm')} />
      </FormField>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo actualizar la contrasena</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Guardando...' : 'Establecer contrasena'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Ir al inicio de sesion
        </Link>
      </p>
    </form>
  )
}
