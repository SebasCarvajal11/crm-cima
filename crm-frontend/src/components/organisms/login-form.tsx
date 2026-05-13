import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormField } from '@/components/molecules/form-field'
import { loginRequest } from '@/auth/auth-api'
import { authKeys } from '@/auth/query-keys'
import {
  loginRequestSchema,
  type LoginRequestValues,
} from '@/auth/schemas/login-request.schema'
import { parseApiError } from '@/auth/parse-api-error'
import { useSessionStore } from '@/auth/session-store'

export type LoginFormValues = LoginRequestValues

/** Organismo: login contra el API Gateway (`POST /auth/login`). */
export function LoginForm() {
  const navigate = useNavigate({ from: '/login' })
  const queryClient = useQueryClient()
  const setSession = useSessionStore((s) => s.setSession)

  const mutation = useMutation({
    mutationFn: async (body: LoginFormValues) => {
      try {
        return await loginRequest(body.email, body.password)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: (data, variables) => {
      // Aislamiento estricto entre sesiones/roles en el mismo navegador.
      queryClient.clear()
      setSession(data.data.access_token, variables.email)
      void queryClient.invalidateQueries({ queryKey: authKeys.all })
      navigate({ to: '/dashboard' })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginRequestSchema),
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <FormField id="email" label="Correo" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} />
      </FormField>
      <FormField id="password" label="Contraseña" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </FormField>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo iniciar sesión</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-sm">
        <Link
          to="/forgot-password"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  )
}
