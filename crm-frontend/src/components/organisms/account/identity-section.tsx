import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, MailWarning } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionIntro } from '@/components/molecules/section-intro'
import { requestEmailVerificationRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'
import type { MeResponse } from '@/auth/auth.types'

type Props = {
  accessToken: string
  identity: MeResponse['data']
}

/** Organismo: seccion de identidad del usuario - estado de verificacion de correo. */
export function IdentitySection({ accessToken, identity }: Props) {
  const isVerified = Boolean(identity.emailVerifiedAt)

  const verifyMutation = useMutation({
    mutationFn: async () => {
      try {
        return await requestEmailVerificationRequest(accessToken)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })

  return (
    <section className="flex h-full flex-col space-y-4">
      <SectionIntro title="Mi cuenta" description="Estado de tu identidad y verificacion de correo." />
      <Card className="flex-1 overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Estado de identidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Correo</p>
              <p className="mt-1 truncate font-medium">{identity.email}</p>
            </div>
            <div className={`rounded-md border p-3 ${isVerified ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
              <p className="text-muted-foreground">Verificacion</p>
              <div className="mt-1 flex items-center gap-2">
                {isVerified ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Verificado</Badge>
                  </>
                ) : (
                  <>
                    <MailWarning className="size-4 text-amber-700" />
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendiente de verificacion</Badge>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isVerified
                  ? 'Tu cuenta ya cumple el requisito de verificacion de correo.'
                  : 'Debes verificar tu correo para completar la seguridad de la cuenta.'}
              </p>
            </div>
          </div>

          {!isVerified && (
            <Button
              type="button"
              variant="default"
              className="h-10 w-full sm:w-auto"
              disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? 'Enviando...' : 'Enviar enlace de verificacion'}
            </Button>
          )}
        </CardContent>

        {verifyMutation.isSuccess && (
          <CardContent className="border-t pt-4">
            <Alert>
              <AlertTitle>Verificacion enviada</AlertTitle>
              <AlertDescription>
                {verifyMutation.data.message} Revisa tu correo y abre el enlace.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        {verifyMutation.isError && (
          <CardContent className="border-t pt-4">
            <Alert variant="destructive">
              <AlertTitle>No se pudo enviar la verificacion</AlertTitle>
              <AlertDescription>{verifyMutation.error.message}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    </section>
  )
}
