import { createFileRoute, Link } from '@tanstack/react-router'
import { VerifyEmailForm } from '@/components/organisms/verify-email-form'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'

type VerifySearch = {
  token?: string
}

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()

  return (
    <AuthCardLayout
      title="Verificar correo"
      description="Confirma tu correo electrónico para finalizar la activación."
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Volver al inicio de sesión
        </Link>
      }
    >
      <VerifyEmailForm token={token} />
    </AuthCardLayout>
  )
}

