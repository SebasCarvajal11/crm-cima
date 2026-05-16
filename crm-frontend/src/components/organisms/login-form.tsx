import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormField } from '@/components/molecules/form-field'
import { useLoginFlow } from '@/features/auth/hooks'
import {
  loginRequestSchema,
  type LoginRequestValues,
} from '@/features/auth/model'

export type LoginFormValues = LoginRequestValues

/** Organismo: login contra el API Gateway (`POST /auth/login`). */
export function LoginForm() {
  const mutation = useLoginFlow()

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
      <FormField id="password" label="Contrasena" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </FormField>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo iniciar sesion</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
      <p className="text-center text-sm">
        <Link
          to="/forgot-password"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Olvidaste tu contrasena?
        </Link>
      </p>
    </form>
  )
}
