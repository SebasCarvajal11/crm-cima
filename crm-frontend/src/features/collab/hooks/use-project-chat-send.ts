import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/shared/lib'
import { postExternalChatRequest, postInternalChatRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { PaginatedData, ProjectChatMessage } from '@/features/collab/model'
import type { MeResponse } from '@/shared/types'

type Channel = 'external' | 'internal'

type Params = {
  accessToken: string
  projectId: string
  channel: Channel
  identity: MeResponse['data']
  onError: (msg: string) => void
  setBody: (value: string) => void
}

export function useProjectChatSend({ accessToken, projectId, channel, identity, onError, setBody }: Params) {
  const queryClient = useQueryClient()

  const queryKey = channel === 'external' ? collabKeys.chatExternal(projectId) : collabKeys.chatInternal(projectId)
  const postMessageRequest = channel === 'external' ? postExternalChatRequest : postInternalChatRequest

  const send = useMutation({
    mutationFn: async ({
      trimmedBody,
      mentions,
    }: {
      trimmedBody: string
      mentions: string[]
    }) => {
      return postMessageRequest(accessToken, projectId, { body: trimmedBody, mentions })
    },
    onMutate: async ({ trimmedBody, mentions }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<{ data: PaginatedData<ProjectChatMessage> }>(queryKey)
      const optimisticId = `temp-${channel}-${Date.now()}`
      const optimisticMessage: ProjectChatMessage = {
        id: optimisticId,
        projectId,
        channel,
        messageType: 'text',
        authorSub: identity.id,
        authorEmail: identity.email ?? null,
        authorFirstName: identity.first_name ?? null,
        authorLastName: identity.last_name ?? null,
        authorRole: identity.role ?? null,
        authorProfession: identity.profession ?? null,
        body: trimmedBody,
        mentionedSubs: mentions.length > 0 ? mentions : null,
        metadata: null,
        createdAt: new Date().toISOString(),
        readStatus: {
          isSeen: false,
          requiredCount: 0,
          seenCount: 0,
        },
      }

      queryClient.setQueryData(queryKey, (current: { data: PaginatedData<ProjectChatMessage> } | undefined) => ({
        data: current?.data
          ? { ...current.data, items: [...current.data.items, optimisticMessage] }
          : { items: [optimisticMessage], page: 1, limit: 100, total: 1, total_pages: 1 },
      }))
      setBody('')

      return {
        previous,
        optimisticId,
        trimmedBody,
      }
    },
    onSuccess: (res, _variables, context) => {
      queryClient.setQueryData(queryKey, (current: { data: PaginatedData<ProjectChatMessage> } | undefined) => ({
        data: current?.data
          ? { ...current.data, items: current.data.items.map((message) => (message.id === context?.optimisticId ? res.data : message)) }
          : current?.data,
      }))
    },
    onError: async (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      if (context?.trimmedBody) {
        setBody(context.trimmedBody)
      }
      const message = await parseApiError(error)
      onError(message || 'No se pudo enviar el mensaje')
    },
  })

  return { send }
}





