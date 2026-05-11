import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { LoginForm } from '@/components/organisms/login-form'
import { useSessionStore } from '@/auth/session-store'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = useSessionStore.getState().token
    if (token) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
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
