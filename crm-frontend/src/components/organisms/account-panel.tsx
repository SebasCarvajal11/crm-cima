import { IdentitySection } from './account/identity-section'
import { SessionsSection } from './account/sessions-section'
import { ChangePasswordSection } from './account/change-password-section'
import type { MeResponse } from '@/auth/auth.types'

type Props = {
  accessToken: string
  identity: MeResponse['data']
}

/** Organismo raiz del panel de cuenta del usuario. */
export function AccountPanel({ accessToken, identity }: Props) {
  return (
    <div className="space-y-8">
      <IdentitySection accessToken={accessToken} identity={identity} />
      <SessionsSection accessToken={accessToken} />
      <ChangePasswordSection accessToken={accessToken} />
    </div>
  )
}
