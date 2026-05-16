import { Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { VerifyEmailForm } from '@/features/auth/ui'

type Props = { token?: string }

export function VerifyEmailPage({ token }: Props) {
  return (
    <AuthCardLayout
      title="Verificar correo"
      description="Confirma tu correo electronico para finalizar la activacion."
      footer={<Link to="/login" className="underline underline-offset-4 hover:text-foreground">Volver al inicio de sesion</Link>}
    >
      <VerifyEmailForm token={token} />
    </AuthCardLayout>
  )
}
