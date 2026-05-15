import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/molecules/form-field'
import { inviteAdminRequest, inviteClientRequest, registerWorkerRequest } from '@/auth/auth-api'
import { adminUsersKeys } from '@/auth/query-keys'
import { parseApiError } from '@/auth/parse-api-error'

const inviteClientSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  client_kind: z.enum(['natural', 'juridical']),
  company_name: z.string().trim().max(160).optional(),
}).superRefine((value, ctx) => {
  if (value.client_kind === 'juridical' && !value.company_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company_name'], message: 'Requerido para cliente juridico' })
  }
})

const registerWorkerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  profession: z.string().trim().min(1, 'Requerido').max(160),
})

const inviteAdminSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  secret_password: z.string().min(1, 'Requerido'),
})

type Props = {
  accessToken: string
}

const cardClass = 'overflow-hidden border-border/80 shadow-sm'
const cardHeaderClass = 'border-b bg-muted/20'
const inputClass = 'h-10'
const pairClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2'

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
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
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
      try {
        return await registerWorkerRequest(accessToken, payload)
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => { workerForm.reset(); invalidate() },
  })

  const adminForm = useForm<z.infer<typeof inviteAdminSchema>>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: { email: '', first_name: '', last_name: '', secret_password: '' },
  })

  const adminMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof inviteAdminSchema>) => {
      try {
        return await inviteAdminRequest(accessToken, payload)
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => { adminForm.reset(); invalidate() },
  })

  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <Card className={cardClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-base tracking-tight">Invitar cliente</CardTitle>
          <CardDescription>Envia una invitacion por correo con datos del cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={inviteForm.handleSubmit((values) => inviteMutation.mutate(values))}>
            <FormField id="invite-email" label="Correo" error={inviteForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" className={inputClass} {...inviteForm.register('email')} />
            </FormField>
            <div className={pairClass}>
              <FormField id="invite-first" label="Nombres" error={inviteForm.formState.errors.first_name?.message}>
                <Input className={inputClass} {...inviteForm.register('first_name')} />
              </FormField>
              <FormField id="invite-last" label="Apellidos" error={inviteForm.formState.errors.last_name?.message}>
                <Input className={inputClass} {...inviteForm.register('last_name')} />
              </FormField>
            </div>
            <FormField id="invite-kind" label="Tipo de cliente" error={inviteForm.formState.errors.client_kind?.message}>
              <Select
                value={inviteKind}
                onValueChange={(value) => inviteForm.setValue('client_kind', value as 'natural' | 'juridical', { shouldValidate: true })}
              >
                <SelectTrigger id="invite-kind" className="h-10 w-full">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Persona natural</SelectItem>
                  <SelectItem value="juridical">Persona juridica</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {inviteKind === 'juridical' && (
              <FormField id="invite-company" label="Empresa" error={inviteForm.formState.errors.company_name?.message}>
                <Input className={inputClass} {...inviteForm.register('company_name')} />
              </FormField>
            )}
            {inviteMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear la invitacion</AlertTitle>
                <AlertDescription>{inviteMutation.error.message}</AlertDescription>
              </Alert>
            )}
            {inviteMutation.isSuccess && (
              <Alert>
                <AlertTitle>Invitacion enviada</AlertTitle>
                <AlertDescription>{inviteMutation.data.message}</AlertDescription>
              </Alert>
            )}
            <Button className="h-10 w-full" type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Creando...' : 'Crear invitacion'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-base tracking-tight">Registrar trabajador</CardTitle>
          <CardDescription>Crea la cuenta y envia por correo la contrasena temporal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={workerForm.handleSubmit((values) => workerMutation.mutate(values))}>
            <FormField id="worker-email" label="Correo" error={workerForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" className={inputClass} {...workerForm.register('email')} />
            </FormField>
            <div className={pairClass}>
              <FormField id="worker-first" label="Nombres" error={workerForm.formState.errors.first_name?.message}>
                <Input className={inputClass} {...workerForm.register('first_name')} />
              </FormField>
              <FormField id="worker-last" label="Apellidos" error={workerForm.formState.errors.last_name?.message}>
                <Input className={inputClass} {...workerForm.register('last_name')} />
              </FormField>
            </div>
            <FormField id="worker-prof" label="Profesion" error={workerForm.formState.errors.profession?.message}>
              <Input className={inputClass} {...workerForm.register('profession')} />
            </FormField>
            {workerMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo registrar el trabajador</AlertTitle>
                <AlertDescription>{workerMutation.error.message}</AlertDescription>
              </Alert>
            )}
            {workerMutation.isSuccess && (
              <Alert>
                <AlertTitle>Trabajador registrado</AlertTitle>
                <AlertDescription>
                  Se creo el usuario {workerMutation.data.data.user.email} y se envio el acceso temporal por correo.
                </AlertDescription>
              </Alert>
            )}
            <Button className="h-10 w-full" type="submit" disabled={workerMutation.isPending}>
              {workerMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-base tracking-tight">Invitar administrador</CardTitle>
          <CardDescription>Requiere la contrasena secreta del gerente para autorizar esta accion.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={adminForm.handleSubmit((values) => adminMutation.mutate(values))}>
            <FormField id="admin-email" label="Correo" error={adminForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" className={inputClass} {...adminForm.register('email')} />
            </FormField>
            <div className={pairClass}>
              <FormField id="admin-first" label="Nombres" error={adminForm.formState.errors.first_name?.message}>
                <Input className={inputClass} {...adminForm.register('first_name')} />
              </FormField>
              <FormField id="admin-last" label="Apellidos" error={adminForm.formState.errors.last_name?.message}>
                <Input className={inputClass} {...adminForm.register('last_name')} />
              </FormField>
            </div>
            <FormField id="admin-secret" label="Contrasena secreta" error={adminForm.formState.errors.secret_password?.message}>
              <Input type="password" autoComplete="current-password" className={inputClass} {...adminForm.register('secret_password')} />
            </FormField>
            {adminMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo invitar al administrador</AlertTitle>
                <AlertDescription>{adminMutation.error.message}</AlertDescription>
              </Alert>
            )}
            {adminMutation.isSuccess && (
              <Alert>
                <AlertTitle>Administrador creado</AlertTitle>
                <AlertDescription>{adminMutation.data.message}</AlertDescription>
              </Alert>
            )}
            <Button className="h-10 w-full" type="submit" disabled={adminMutation.isPending}>
              {adminMutation.isPending ? 'Creando...' : 'Invitar administrador'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
