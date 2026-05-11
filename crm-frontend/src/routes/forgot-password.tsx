import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { ForgotPasswordForm } from '@/components/organisms/forgot-password-form'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <AuthCardLayout
      title="Recuperar contraseña"
      description="Te enviaremos un enlace si el correo está registrado en el sistema."
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Volver al inicio de sesión
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCardLayout>
  )
}
