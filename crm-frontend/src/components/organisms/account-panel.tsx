import { ProfileSection } from './account/profile-section'
import { SessionsSection } from './account/sessions-section'
import { ChangePasswordSection } from './account/change-password-section'
import type { MeResponse } from '@/features/auth/model'

type Props = {
  accessToken: string
  identity: MeResponse['data']
}

/** Organismo raiz del panel de cuenta del usuario. */
export function AccountPanel({ accessToken, identity }: Props) {
  return (
    <div className="space-y-10">
      <ProfileSection accessToken={accessToken} identity={identity} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <SessionsSection accessToken={accessToken} />
        <ChangePasswordSection accessToken={accessToken} />
      </div>
    </div>
  )
}

