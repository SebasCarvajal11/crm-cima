import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { verifyEmailRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'

type VerifyEmailFormProps = {
  token?: string
}

/** Organismo: confirmar correo con token recibido por enlace. */
export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Falta el token de verificación.')
      try {
        return await verifyEmailRequest({ token })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Enlace no válido</AlertTitle>
        <AlertDescription>
          Falta el parámetro <code className="rounded bg-muted px-1">token</code> en la URL.
          Solicita un nuevo envío desde tu cuenta.
        </AlertDescription>
      </Alert>
    )
  }

  if (mutation.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Correo verificado</AlertTitle>
          <AlertDescription>{mutation.data.message}</AlertDescription>
        </Alert>
        <Button className="w-full" onClick={() => navigate({ to: '/login' })}>
          Ir al inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Confirmar correo</AlertTitle>
        <AlertDescription>
          Confirma tu correo para activar completamente tu cuenta.
        </AlertDescription>
      </Alert>

      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo verificar el correo</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Verificando…' : 'Verificar correo'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}

