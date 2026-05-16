import { useEffect, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listExternalChatRequest,
  listInternalChatRequest,
  markExternalChatReadRequest,
  markInternalChatReadRequest,
} from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import { getUserAvatarsRequest } from '@/features/media/api'
import type { ProjectMember } from '@/features/collab/model'

type Channel = 'external' | 'internal'

type Params = {
  accessToken: string
  projectId: string
  isClient: boolean
  channel: Channel
  members: ProjectMember[]
  lastMarkedRef: MutableRefObject<Record<Channel, string | null>>
}

export function useProjectChatData({
  accessToken,
  projectId,
  isClient,
  channel,
  members,
  lastMarkedRef,
}: Params) {
  const queryClient = useQueryClient()

  const externalQ = useQuery({
    queryKey: collabKeys.chatExternal(projectId),
    queryFn: () => listExternalChatRequest(accessToken, projectId),
    staleTime: 15_000,
  })

  const internalQ = useQuery({
    queryKey: collabKeys.chatInternal(projectId),
    queryFn: () => listInternalChatRequest(accessToken, projectId),
    enabled: !isClient,
    staleTime: 15_000,
  })

  const messages = channel === 'external' ? (externalQ.data?.data.items ?? []) : (internalQ.data?.data.items ?? [])
  const lastMessageId = messages[messages.length - 1]?.id ?? null
  const memberBySub = useMemo(() => new Map(members.map((member) => [member.userSub, member] as const)), [members])
  const avatarSubjects = useMemo(() => Array.from(new Set(members.map((m) => m.userSub))), [members])

  const avatarsQ = useQuery({
    queryKey: ['media', 'avatars', 'users', projectId, avatarSubjects.join(',')],
    queryFn: () => getUserAvatarsRequest(accessToken, avatarSubjects),
    enabled: avatarSubjects.length > 0,
    staleTime: 60_000,
  })

  const avatarBySub = avatarsQ.data?.data.items ?? {}

  useEffect(() => {
    if (!lastMessageId) return
    if (lastMarkedRef.current[channel] === lastMessageId) return

    lastMarkedRef.current[channel] = lastMessageId
    const req = channel === 'external' ? markExternalChatReadRequest : markInternalChatReadRequest

    void req(accessToken, projectId, { up_to_message_id: lastMessageId })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: collabKeys.mentionNotifications() })
        void queryClient.invalidateQueries({ queryKey: collabKeys.mentionNotificationsCount() })
      })
      .catch(() => undefined)
  }, [accessToken, projectId, channel, lastMessageId, queryClient, lastMarkedRef])

  return {
    externalQ,
    internalQ,
    messages,
    memberBySub,
    avatarBySub,
  }
}


