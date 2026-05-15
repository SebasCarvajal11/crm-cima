import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { LoginForm } from '@/components/organisms/login-form'
import { useSessionStore } from '@/auth/session-store'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const token = useSessionStore((s) => s.token)
  const bootstrapped = useSessionStore((s) => s.bootstrapped)
  const navigate = useNavigate({ from: '/login' })

  useEffect(() => {
    if (!bootstrapped || !token) return
    navigate({ to: '/dashboard', replace: true })
  }, [bootstrapped, token, navigate])

  if (!bootstrapped) {
    return null
  }

  if (token) {
    return null
  }

  return (
    <AuthCardLayout
      title="Iniciar sesión"
      description="Acceso vía API Gateway (KrakenD) → mod-auth."
      footer={
        <Link to="/" className="underline underline-offset-4 hover:text-foreground">
          Volver al inicio
        </Link>
      }
    >
      <LoginForm />
    </AuthCardLayout>
  )
}
