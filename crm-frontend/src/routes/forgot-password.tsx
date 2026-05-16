import { createFileRoute } from '@tanstack/react-router'
import { authPages } from '@/pages'

export const Route = createFileRoute('/forgot-password')({
  component: authPages.ForgotPasswordPage,
})

