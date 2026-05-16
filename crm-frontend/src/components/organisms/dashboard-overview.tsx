import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionIntro } from '@/components/molecules/section-intro'
import { gatewayContractPaths } from '@/features/auth/utils'
import { getApiBaseUrl } from '@/app/session/session-store'
import type { MeResponse } from '@/features/auth/model'

type DashboardOverviewProps = {
  identity: MeResponse['data']
}

/** Organismo: resumen de identidad y enlaces útiles (documentación API en gateway). */
export function DashboardOverview({ identity }: DashboardOverviewProps) {
  const docsBase = getApiBaseUrl()

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Resumen"
        description="Datos de identidad proporcionados por mod-auth a través del API Gateway."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu cuenta</CardTitle>
            <CardDescription>UUID público (subject) y rol.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{identity.email}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Rol</span>
              <Badge variant="secondary">{identity.role}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Subject</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {identity.id}
              </code>
            </div>
            {identity.force_password_change ? (
              <p className="text-amber-600 dark:text-amber-500">
                Debes cambiar la contraseña (política de cuenta).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentación</CardTitle>
            <CardDescription>OpenAPI servido por el mismo gateway.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" size="sm" className="justify-between" asChild>
              <a
                href={`${docsBase}${gatewayContractPaths.swaggerUi}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Swagger UI en una nueva pestaña"
              >
                Swagger UI
                <ExternalLink className="size-4 opacity-70" />
                <span className="sr-only">(se abre en una nueva pestaña)</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" className="justify-between" asChild>
              <a
                href={`${docsBase}${gatewayContractPaths.openApiYaml}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir archivo openapi.yaml en una nueva pestaña"
              >
                openapi.yaml
                <ExternalLink className="size-4 opacity-70" />
                <span className="sr-only">(se abre en una nueva pestaña)</span>
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


