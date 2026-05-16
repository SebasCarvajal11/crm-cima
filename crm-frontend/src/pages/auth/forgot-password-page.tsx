import { Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { ForgotPasswordForm } from '@/features/auth/ui'

export function ForgotPasswordPage() {
  return (
    <AuthCardLayout
      title="Recuperar contrasena"
      description="Te enviaremos un enlace si el correo esta registrado en el sistema."
      footer={<Link to="/login" className="underline underline-offset-4 hover:text-foreground">Volver al inicio de sesion</Link>}
    >
      <ForgotPasswordForm />
    </AuthCardLayout>
  )
}
