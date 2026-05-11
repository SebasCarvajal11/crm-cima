import { useMutation } from '@tanstack/react-query'
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

/** Organismo: seccion de identidad del usuario — estado de verificacion de correo. */
export function IdentitySection({ accessToken, identity }: Props) {
  const verifyMutation = useMutation({
    mutationFn: async () => {
      try { return await requestEmailVerificationRequest(accessToken) }
      catch (e) { throw new Error(await parseApiError(e), { cause: e }) }
    },
  })

  return (
    <section className="space-y-4">
      <SectionIntro title="Identidad" description="Estado de la cuenta segun el modulo de autenticacion." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Correo verificado</span>
            <div className="font-medium mt-1">
              {identity.emailVerifiedAt
                ? <Badge variant="secondary">Verificado</Badge>
                : <Badge variant="outline">Pendiente</Badge>}
            </div>
          </div>
          {!identity.emailVerifiedAt && (
            <Button type="button" variant="secondary" size="sm"
              disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}>
              {verifyMutation.isPending ? 'Enviando…' : 'Enviar enlace de verificacion'}
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
