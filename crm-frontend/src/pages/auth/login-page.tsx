import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { LoginForm } from '@/features/auth/ui'
import { useSessionStore } from '@/app/session/session-store'

export function LoginPage() {
  const token = useSessionStore((s) => s.token)
  const bootstrapped = useSessionStore((s) => s.bootstrapped)
  const navigate = useNavigate({ from: '/login' })

  useEffect(() => {
    if (!bootstrapped || !token) return
    navigate({ to: '/dashboard', replace: true })
  }, [bootstrapped, token, navigate])

  if (!bootstrapped || token) return null

  return (
    <AuthCardLayout
      title="Iniciar sesion"
      description="Acceso via API Gateway (KrakenD) -> mod-auth."
      footer={<Link to="/" className="underline underline-offset-4 hover:text-foreground">Volver al inicio</Link>}
    >
      <LoginForm />
    </AuthCardLayout>
  )
}

