import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/pages'
import { parseDashboardSearch } from './-dashboard.search'

export const Route = createFileRoute('/dashboard')({
  validateSearch: parseDashboardSearch,
  component: DashboardRoute,
})

function DashboardRoute() {
  const search = Route.useSearch()
  return <DashboardPage {...search} />
}

