import { createFileRoute } from '@tanstack/react-router'
import { authPages } from '@/pages'

type VerifySearch = { token?: string }

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: VerifyEmailRoute,
})

function VerifyEmailRoute() {
  const { token } = Route.useSearch()
  return <authPages.VerifyEmailPage token={token} />
}

