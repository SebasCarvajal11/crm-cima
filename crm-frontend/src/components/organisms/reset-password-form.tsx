import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormField } from '@/components/molecules/form-field'
import { resetPasswordRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'
import { strongPasswordSchema } from '@/auth/schemas/password.schema'

const schema = z
  .object({
    password: strongPasswordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

type Values = z.infer<typeof schema>

type ResetPasswordFormProps = {
  token: string | undefined
}

/** Organismo: nueva contraseña con token del enlace de recuperación. */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: async (body: Values) => {
      if (!token) throw new Error('Falta el token de recuperación')
      try {
        return await resetPasswordRequest({ token, password: body.password })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => {
      navigate({ to: '/login' })
    },
  })

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
        <AlertTitle>Enlace no válido</AlertTitle>
        <AlertDescription>
          Falta el parámetro <code className="rounded bg-muted px-1">token</code> en la URL.
          Solicita un nuevo enlace desde recuperación de contraseña.
        </AlertDescription>
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link to="/forgot-password">Solicitar enlace</Link>
        </Button>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <FormField id="password" label="Nueva contraseña" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </FormField>
      <FormField id="confirm" label="Confirmar" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('confirm')} />
      </FormField>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo actualizar la contraseña</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Guardando…' : 'Establecer contraseña'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Ir al inicio de sesión
        </Link>
      </p>
    </form>
  )
}
