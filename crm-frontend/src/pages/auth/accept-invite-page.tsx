import { Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { AcceptInviteForm } from '@/features/auth/ui'

type Props = { token: string }

export function AcceptInvitePage({ token }: Props) {
  return (
    <AuthCardLayout
      title="Aceptar invitacion"
      description="Establece tu contrasena para activar el acceso al CRM."
      footer={<Link to="/login" className="underline underline-offset-4 hover:text-foreground">Ya tengo cuenta - iniciar sesion</Link>}
    >
      <AcceptInviteForm token={token} />
    </AuthCardLayout>
  )
}
