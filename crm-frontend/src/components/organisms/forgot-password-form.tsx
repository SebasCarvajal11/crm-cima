import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormField } from '@/components/molecules/form-field'
import { forgotPasswordRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'

const schema = z.object({
  email: z.string().email('Correo no válido'),
})

type Values = z.infer<typeof schema>

/** Organismo: solicitud de enlace de recuperación vía gateway. */
export function ForgotPasswordForm() {
  const mutation = useMutation({
    mutationFn: async (body: Values) => {
      try {
        return await forgotPasswordRequest(body)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  if (mutation.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Solicitud registrada</AlertTitle>
          <AlertDescription>
            Si el correo existe en el sistema, recibirás instrucciones para restablecer la
            contraseña.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full" asChild>
          <Link to="/login">Volver al inicio de sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <FormField id="email" label="Correo" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} />
      </FormField>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo enviar el enlace</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Enviando…' : 'Enviar enlace'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  )
}
