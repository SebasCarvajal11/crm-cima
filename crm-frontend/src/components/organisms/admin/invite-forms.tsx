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

const inviteClientSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  client_kind: z.enum(['natural', 'juridical']),
  company_name: z.string().trim().max(160).optional(),
}).superRefine((v, ctx) => {
  if (v.client_kind === 'juridical' && !v.company_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company_name'], message: 'Requerido para cliente juridico' })
  }
})

const registerWorkerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  profession: z.string().trim().min(1, 'Requerido').max(160),
})

type Props = {
  accessToken: string
}

export function AdminInviteForms({ accessToken }: Props) {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: adminUsersKeys.all })

  const inviteForm = useForm<z.infer<typeof inviteClientSchema>>({
    resolver: zodResolver(inviteClientSchema),
    defaultValues: { email: '', first_name: '', last_name: '', client_kind: 'natural', company_name: '' },
  })

  const inviteKind = inviteForm.watch('client_kind')

  const inviteMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof inviteClientSchema>) => {
      try {
        return await inviteClientRequest(accessToken, {
          ...payload,
          company_name: payload.client_kind === 'juridical' ? payload.company_name : undefined,
        })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => { inviteForm.reset(); invalidate() },
  })

  const workerForm = useForm<z.infer<typeof registerWorkerSchema>>({
    resolver: zodResolver(registerWorkerSchema),
    defaultValues: { email: '', first_name: '', last_name: '', profession: '' },
  })

  const workerMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof registerWorkerSchema>) => {
      try { return await registerWorkerRequest(accessToken, payload) }
      catch (e) { throw new Error(await parseApiError(e), { cause: e }) }
    },
    onSuccess: () => { workerForm.reset(); invalidate() },
  })

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitar cliente</CardTitle>
          <CardDescription>Envia una invitacion por correo con datos del cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))}>
            <FormField id="invite-email" label="Correo" error={inviteForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...inviteForm.register('email')} />
            </FormField>
            <FormField id="invite-first" label="Nombres" error={inviteForm.formState.errors.first_name?.message}>
              <Input {...inviteForm.register('first_name')} />
            </FormField>
            <FormField id="invite-last" label="Apellidos" error={inviteForm.formState.errors.last_name?.message}>
              <Input {...inviteForm.register('last_name')} />
            </FormField>
            <FormField id="invite-kind" label="Tipo de cliente" error={inviteForm.formState.errors.client_kind?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...inviteForm.register('client_kind')}>
                <option value="natural">Persona natural</option>
                <option value="juridical">Persona juridica</option>
              </select>
            </FormField>
            {inviteKind === 'juridical' && (
              <FormField id="invite-company" label="Empresa" error={inviteForm.formState.errors.company_name?.message}>
                <Input {...inviteForm.register('company_name')} />
              </FormField>
            )}
            {inviteMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear la invitacion</AlertTitle>
                <AlertDescription>{inviteMutation.error.message}</AlertDescription>
              </Alert>
            )}
            {inviteMutation.isSuccess && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>{inviteMutation.data.message}</p>
                {inviteMutation.data.data.token && <p className="mt-2 font-mono text-xs break-all">Token (dev): {inviteMutation.data.data.token}</p>}
              </div>
            )}
            <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? 'Creando...' : 'Crear invitacion'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar trabajador</CardTitle>
          <CardDescription>Crea una cuenta de trabajador con datos de perfil y contrasena temporal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={workerForm.handleSubmit((v) => workerMutation.mutate(v))}>
            <FormField id="worker-email" label="Correo" error={workerForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...workerForm.register('email')} />
            </FormField>
            <FormField id="worker-first" label="Nombres" error={workerForm.formState.errors.first_name?.message}>
              <Input {...workerForm.register('first_name')} />
            </FormField>
            <FormField id="worker-last" label="Apellidos" error={workerForm.formState.errors.last_name?.message}>
              <Input {...workerForm.register('last_name')} />
            </FormField>
            <FormField id="worker-prof" label="Profesion" error={workerForm.formState.errors.profession?.message}>
              <Input {...workerForm.register('profession')} />
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
                {workerMutation.data.data.temp_password && <p className="mt-2 font-mono text-xs">Contrasena temporal (dev): {workerMutation.data.data.temp_password}</p>}
              </div>
            )}
            <Button type="submit" disabled={workerMutation.isPending}>{workerMutation.isPending ? 'Registrando...' : 'Registrar'}</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
