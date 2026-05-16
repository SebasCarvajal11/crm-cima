import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  inviteAdminRequest,
  inviteClientRequest,
  registerWorkerRequest,
} from '@/features/admin/api'
import { adminUsersKeys } from '@/features/admin/model'
import { parseApiError } from '@/features/admin/utils'

export const inviteClientSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  client_kind: z.enum(['natural', 'juridical']),
  company_name: z.string().trim().max(160).optional(),
}).superRefine((value, ctx) => {
  if (value.client_kind === 'juridical' && !value.company_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company_name'], message: 'Requerido para cliente juridico' })
  }
})

export const registerWorkerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  profession: z.string().trim().min(1, 'Requerido').max(160),
})

export const inviteAdminSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1, 'Requerido').max(120),
  last_name: z.string().trim().min(1, 'Requerido').max(120),
  secret_password: z.string().min(1, 'Requerido'),
})

export function useAdminInvites(accessToken: string) {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: adminUsersKeys.all })

  const inviteMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof inviteClientSchema>) => {
      try {
        return await inviteClientRequest(accessToken, {
          ...payload,
          company_name: payload.client_kind === 'juridical' ? payload.company_name : undefined,
        })
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => invalidate(),
  })

  const workerMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof registerWorkerSchema>) => {
      try {
        return await registerWorkerRequest(accessToken, payload)
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => invalidate(),
  })

  const adminMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof inviteAdminSchema>) => {
      try {
        return await inviteAdminRequest(accessToken, payload)
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => invalidate(),
  })

  return { adminMutation, inviteMutation, workerMutation }
}
