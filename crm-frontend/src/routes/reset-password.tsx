import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { ResetPasswordForm } from '@/components/organisms/reset-password-form'

type ResetSearch = {
  token?: string
}

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <AuthCardLayout
      title="Nueva contraseña"
      description="Define una contraseña segura para tu cuenta."
      footer={
        <Link to="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          Solicitar otro enlace
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCardLayout>
  )
}
