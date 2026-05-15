import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/molecules/form-field'
import { SectionIntro } from '@/components/molecules/section-intro'
import { changePasswordRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'
import { strongPasswordSchema } from '@/auth/schemas/password.schema'
import { useSessionStore } from '@/auth/session-store'

const changePwdSchema = z
  .object({
    old_password: z.string().min(1, 'Requerido'),
    new_password: strongPasswordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'Las contrasenas no coinciden',
    path: ['confirm'],
  })

type Props = {
  accessToken: string
}

/** Organismo: formulario para cambiar la contrasena del usuario autenticado. */
export function ChangePasswordSection({ accessToken }: Props) {
  const queryClient = useQueryClient()
  const redirectTimeoutRef = useRef<number | null>(null)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<z.infer<typeof changePwdSchema> | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof changePwdSchema>>({
    resolver: zodResolver(changePwdSchema),
    defaultValues: { old_password: '', new_password: '', confirm: '' },
  })

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current != null) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const mutation = useMutation({
    mutationFn: async (body: z.infer<typeof changePwdSchema>) => {
      try {
        await changePasswordRequest(accessToken, {
          old_password: body.old_password,
          new_password: body.new_password,
        })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => {
      reset()
      redirectTimeoutRef.current = window.setTimeout(() => {
        queryClient.clear()
        useSessionStore.getState().clearSession()
        window.location.replace('/login')
      }, 1200)
    },
  })

  return (
    <section className="space-y-4">
      <SectionIntro
        title="Seguridad"
        description="Al cambiarla se cerraran tus sesiones y deberas iniciar sesion de nuevo."
      />
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Nueva contrasena</CardTitle>
          <CardDescription>Minimo 8 caracteres; mayuscula, numero y simbolo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => {
              setPendingPayload(values)
              setConfirmSubmitOpen(true)
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="old_password" label="Contrasena actual" error={errors.old_password?.message}>
                <Input type="password" autoComplete="current-password" {...register('old_password')} />
              </FormField>
              <div className="hidden sm:block" />
              <FormField id="new_password" label="Nueva contrasena" error={errors.new_password?.message}>
                <Input type="password" autoComplete="new-password" {...register('new_password')} />
              </FormField>
              <FormField id="confirm" label="Confirmar contrasena" error={errors.confirm?.message}>
                <Input type="password" autoComplete="new-password" {...register('confirm')} />
              </FormField>
            </div>

            {mutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo cambiar la contrasena</AlertTitle>
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            )}

            {mutation.isSuccess && (
              <Alert>
                <AlertTitle>Contrasena actualizada</AlertTitle>
                <AlertDescription>
                  Se cerrara tu sesion en unos segundos para proteger la cuenta.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                disabled={mutation.isPending || mutation.isSuccess || !isDirty}
                onClick={() => setConfirmCancelOpen(true)}
              >
                Cancelar cambios
              </Button>
              <Button className="h-10" type="submit" disabled={mutation.isPending || mutation.isSuccess}>
                {mutation.isPending ? 'Guardando...' : 'Actualizar contrasena'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar actualizacion de contrasena</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerraran tus sesiones activas y tendras que iniciar sesion nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingPayload) return
                mutation.mutate(pendingPayload)
                setPendingPayload(null)
              }}
            >
              Confirmar cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
            <AlertDialogDescription>
              Se limpiaran los campos del formulario de seguridad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset()
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
