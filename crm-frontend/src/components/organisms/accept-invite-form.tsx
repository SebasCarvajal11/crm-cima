import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/molecules/form-field'
import {
  acceptInviteRequest,
  getInvitationPreviewRequest,
} from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'
import { useSessionStore } from '@/auth/session-store'
import { strongPasswordSchema } from '@/auth/schemas/password.schema'

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

type AcceptInviteFormProps = {
  token: string
}

/** Organismo: aceptar invitacion y fijar contrasena inicial (gateway). */
export function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setSession = useSessionStore((s) => s.setSession)

  const previewQuery = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => getInvitationPreviewRequest(token),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: async (body: Values) => {
      try {
        return await acceptInviteRequest({ token, password: body.password })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: (data) => {
      setSession(data.data.access_token)
      void queryClient.invalidateQueries()
      navigate({ to: '/dashboard' })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  })

  if (previewQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-[75%] max-w-xs" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (previewQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar la invitacion</AlertTitle>
        <AlertDescription>
          El enlace puede haber expirado o ser invalido.
        </AlertDescription>
      </Alert>
    )
  }

  const email = previewQuery.data?.data.email

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      {email ? (
        <p className="text-sm text-muted-foreground">
          Invitacion para{' '}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      ) : null}
      <FormField id="password" label="Contrasena" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </FormField>
      <FormField id="confirm" label="Confirmar" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('confirm')} />
      </FormField>
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo activar la cuenta</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Activando…' : 'Activar cuenta'}
      </Button>
    </form>
  )
}
