import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/app/session/session-store'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const token = useSessionStore((s) => s.token)
  const email = useSessionStore((s) => s.email)
  const clearSession = useSessionStore((s) => s.clearSession)
  const isAuthenticated = Boolean(token)

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-8 p-4">
      <div className="space-y-2 text-center">
        <h1 className="text-5xl font-black uppercase tracking-tight">CRM CIMA</h1>
        <p className="text-lg font-medium text-muted-foreground">
          SPA sobre el API Gateway (KrakenD); sesión JWT desde mod-auth.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isAuthenticated ? (
          <>
            <p className="text-xl font-medium">Hola, {email ?? 'usuario'}.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="lg">
                <Link to="/dashboard">Ir al panel</Link>
              </Button>
              <Button size="lg" variant="destructive" onClick={() => clearSession()}>
                Cerrar sesión
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

