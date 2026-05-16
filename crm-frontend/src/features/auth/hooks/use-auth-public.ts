import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  acceptInviteRequest,
  forgotPasswordRequest,
  getInvitationPreviewRequest,
  loginRequest,
  resetPasswordRequest,
  verifyEmailRequest,
} from '@/features/auth/api'
import { authKeys } from '@/features/auth/model'
import { parseApiError } from '@/features/auth/utils'
import { useSessionStore } from '@/app/session/session-store'

export function useLoginFlow() {
  const navigate = useNavigate({ from: '/login' })
  const queryClient = useQueryClient()
  const setSession = useSessionStore((s) => s.setSession)

  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      try {
        return await loginRequest(body.email, body.password)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: (data, variables) => {
      queryClient.clear()
      setSession(data.data.access_token, variables.email)
      void queryClient.invalidateQueries({ queryKey: authKeys.all })
      navigate({ to: '/dashboard' })
    },
  })
}

export function useForgotPasswordFlow() {
  return useMutation({
    mutationFn: async (body: { email: string }) => {
      try {
        return await forgotPasswordRequest(body)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })
}

export function useResetPasswordFlow(token: string | undefined) {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (body: { password: string }) => {
      if (!token) throw new Error('Falta el token de recuperacion')
      try {
        return await resetPasswordRequest({ token, password: body.password })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => {
      navigate({ to: '/login' })
    },
  })
}

export function useVerifyEmailFlow(token?: string) {
  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Falta el token de verificacion.')
      try {
        return await verifyEmailRequest({ token })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })
}

export function useAcceptInviteFlow(token: string) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setSession = useSessionStore((s) => s.setSession)

  const previewQuery = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => getInvitationPreviewRequest(token),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: async (body: { password: string }) => {
      try {
        return await acceptInviteRequest({ token, password: body.password })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: (data) => {
      setSession(data.data.access_token)
      void queryClient.invalidateQueries()
      navigate({ to: '/dashboard' })
    },
  })

  return { previewQuery, mutation }
}


