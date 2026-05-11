import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { AcceptInviteForm } from '@/components/organisms/accept-invite-form'

export const Route = createFileRoute('/accept-invite/$token')({
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useParams()

  return (
    <AuthCardLayout
      title="Aceptar invitación"
      description="Establece tu contraseña para activar el acceso al CRM."
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Ya tengo cuenta — iniciar sesión
        </Link>
      }
    >
      <AcceptInviteForm token={token} />
    </AuthCardLayout>
  )
}
