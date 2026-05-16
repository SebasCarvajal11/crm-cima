import { createFileRoute } from '@tanstack/react-router'
import { authPages } from '@/pages'

export const Route = createFileRoute('/accept-invite/$token')({
  component: AcceptInviteRoute,
})

function AcceptInviteRoute() {
  const { token } = Route.useParams()
  return <authPages.AcceptInvitePage token={token} />
}

