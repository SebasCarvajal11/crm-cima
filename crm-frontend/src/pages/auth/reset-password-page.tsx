import { Link } from '@tanstack/react-router'
import { AuthCardLayout } from '@/components/templates/auth-card-layout'
import { ResetPasswordForm } from '@/features/auth/ui'

type Props = { token?: string }

export function ResetPasswordPage({ token }: Props) {
  return (
    <AuthCardLayout
      title="Nueva contrasena"
      description="Define una contrasena segura para tu cuenta."
      footer={<Link to="/forgot-password" className="underline underline-offset-4 hover:text-foreground">Solicitar otro enlace</Link>}
    >
      <ResetPasswordForm token={token} />
    </AuthCardLayout>
  )
}
