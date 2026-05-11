import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/molecules/form-field'
import { inviteClientRequest, registerWorkerRequest } from '@/auth/auth-api'
import { adminUsersKeys } from '@/auth/query-keys'
import { parseApiError } from '@/auth/parse-api-error'

const emailSchema = z.object({ email: z.string().email() })

type Props = {
  accessToken: string
}

/** Organismo: formularios de invitacion de cliente y registro de trabajador (solo admin). */
export function AdminInviteForms({ accessToken }: Props) {
  const queryClient = useQueryClient()
  const invalidate  = () => void queryClient.invalidateQueries({ queryKey: adminUsersKeys.all })

  const inviteForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      try { return await inviteClientRequest(accessToken, { email }) }
      catch (e) { throw new Error(await parseApiError(e), { cause: e }) }
    },
    onSuccess: () => { inviteForm.reset(); invalidate() },
  })

  const workerForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const workerMutation = useMutation({
    mutationFn: async (email: string) => {
      try { return await registerWorkerRequest(accessToken, { email }) }
      catch (e) { throw new Error(await parseApiError(e), { cause: e }) }
    },
    onSuccess: () => { workerForm.reset(); invalidate() },
  })

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitar cliente</CardTitle>
          <CardDescription>Envia una invitacion por correo electronico.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4"
            onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v.email))}>
            <FormField id="invite-email" label="Correo" error={inviteForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...inviteForm.register('email')} />
            </FormField>
            {inviteMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear la invitacion</AlertTitle>
                <AlertDescription>{inviteMutation.error.message}</AlertDescription>
              </Alert>
            )}
            {inviteMutation.isSuccess && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>{inviteMutation.data.message}</p>
                {inviteMutation.data.data.token && (
                  <p className="mt-2 font-mono text-xs break-all">
                    Token (dev): {inviteMutation.data.data.token}
                  </p>
                )}
              </div>
            )}
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Creando…' : 'Crear invitacion'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar trabajador</CardTitle>
          <CardDescription>Crea una cuenta de trabajador con contrasena temporal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4"
            onSubmit={workerForm.handleSubmit((v) => workerMutation.mutate(v.email))}>
            <FormField id="worker-email" label="Correo" error={workerForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...workerForm.register('email')} />
            </FormField>
            {workerMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo registrar el trabajador</AlertTitle>
                <AlertDescription>{workerMutation.error.message}</AlertDescription>
              </Alert>
            )}
            {workerMutation.isSuccess && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>Usuario creado: {workerMutation.data.data.user.email}</p>
                {workerMutation.data.data.temp_password && (
                  <p className="mt-2 font-mono text-xs">
                    Contrasena temporal (dev): {workerMutation.data.data.temp_password}
                  </p>
                )}
              </div>
            )}
            <Button type="submit" disabled={workerMutation.isPending}>
              {workerMutation.isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
