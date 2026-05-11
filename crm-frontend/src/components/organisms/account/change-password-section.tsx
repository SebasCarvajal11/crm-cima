import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/molecules/form-field'
import { SectionIntro } from '@/components/molecules/section-intro'
import { changePasswordRequest } from '@/auth/auth-api'
import { authKeys } from '@/auth/query-keys'
import { parseApiError } from '@/auth/parse-api-error'
import { strongPasswordSchema } from '@/auth/schemas/password.schema'

const changePwdSchema = z.object({
  old_password: z.string().min(1, 'Requerido'),
  new_password: strongPasswordSchema,
  confirm:      z.string(),
}).refine((d) => d.new_password === d.confirm, {
  message: 'Las contrasenas no coinciden',
  path: ['confirm'],
})

type Props = {
  accessToken: string
}

/** Organismo: formulario para cambiar la contrasena del usuario autenticado. */
export function ChangePasswordSection({ accessToken }: Props) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (body: z.infer<typeof changePwdSchema>) => {
      try {
        await changePasswordRequest(accessToken, {
          old_password: body.old_password,
          new_password: body.new_password,
        })
      } catch (e) { throw new Error(await parseApiError(e), { cause: e }) }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.all })
      reset()
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof changePwdSchema>>({
    resolver: zodResolver(changePwdSchema),
    defaultValues: { old_password: '', new_password: '', confirm: '' },
  })

  return (
    <section className="space-y-4">
      <SectionIntro title="Cambiar contrasena" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva contrasena</CardTitle>
          <CardDescription>Minimo 8 caracteres; mayuscula, numero y simbolo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4"
            onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <FormField id="old_password" label="Contrasena actual" error={errors.old_password?.message}>
              <Input type="password" autoComplete="current-password" {...register('old_password')} />
            </FormField>
            <FormField id="new_password" label="Nueva contrasena" error={errors.new_password?.message}>
              <Input type="password" autoComplete="new-password" {...register('new_password')} />
            </FormField>
            <FormField id="confirm" label="Confirmar" error={errors.confirm?.message}>
              <Input type="password" autoComplete="new-password" {...register('confirm')} />
            </FormField>
            {mutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo cambiar la contrasena</AlertTitle>
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            )}
            {mutation.isSuccess && (
              <Alert>
                <AlertTitle>Contrasena actualizada</AlertTitle>
                <AlertDescription>Tu contrasena se actualizo correctamente.</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : 'Actualizar contrasena'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
