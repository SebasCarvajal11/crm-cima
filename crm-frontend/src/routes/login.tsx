import { createFileRoute } from '@tanstack/react-router'
import { authPages } from '@/pages'

export const Route = createFileRoute('/login')({
  component: authPages.LoginPage,
})

