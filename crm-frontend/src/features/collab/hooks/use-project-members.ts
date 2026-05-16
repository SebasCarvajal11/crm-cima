import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/shared/lib'
import { listProjectMembersRequest, upsertProjectMemberRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { ClientSearchResult } from '@/shared/types'
import type { ProjectMember } from '@/features/collab/model'
import { getCurrentAvatarRequest, getUserAvatarsRequest } from '@/features/media/api'
import { pickAvatarUrl } from '@/features/media/utils'

type Params = {
  accessToken: string
  projectId: string
  members: ProjectMember[]
  selectedWorkers: ClientSearchResult[]
  setSelectedWorkers: (updater: (prev: ClientSearchResult[]) => ClientSearchResult[]) => void
  identityEmail?: string | null
  onError: (msg: string) => void
}

export function useProjectMembers({
  accessToken,
  projectId,
  members,
  selectedWorkers,
  setSelectedWorkers,
  identityEmail,
  onError,
}: Params) {
  const queryClient = useQueryClient()

  const membersQ = useQuery({
    queryKey: collabKeys.projectMembers(projectId),
    queryFn: () => listProjectMembersRequest(accessToken, projectId),
    initialData: members.length > 0 ? { data: members } : undefined,
    staleTime: 20_000,
  })

  const resolvedMembers = membersQ.data?.data ?? members
  const avatarSubjects = Array.from(new Set(resolvedMembers.map((m) => m.userSub)))

  const avatarsQ = useQuery({
    queryKey: ['media', 'avatars', 'users', projectId, avatarSubjects.join(',')],
    queryFn: () => getUserAvatarsRequest(accessToken, avatarSubjects),
    enabled: avatarSubjects.length > 0,
    staleTime: 60_000,
  })

  const avatarBySub = avatarsQ.data?.data.items ?? {}

  const currentAvatarQ = useQuery({
    queryKey: ['media', 'avatar', 'current', accessToken],
    queryFn: () => getCurrentAvatarRequest(accessToken),
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 60_000,
  })

  const currentUserAvatarUrl = pickAvatarUrl(currentAvatarQ.data?.data.urls, '64')

  const addWorker = useMutation({
    mutationFn: async () => {
      for (const worker of selectedWorkers) {
        await upsertProjectMemberRequest(accessToken, projectId, {
          user_sub: worker.subject,
          user_email: worker.email,
          role: 'worker',
        })
      }
    },
    onSuccess: () => {
      setSelectedWorkers(() => [])
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectMembers(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
    },
    onError: (error) => {
      void parseApiError(error).then((m) => onError(m || 'No se pudo agregar trabajador al proyecto'))
    },
  })

  const memberAvatarUrl = (memberSub: string, memberEmail?: string | null) =>
    pickAvatarUrl(avatarBySub[memberSub]?.urls, '64') ?? (memberEmail === identityEmail ? currentUserAvatarUrl : null)

  return {
    membersQ,
    resolvedMembers,
    addWorker,
    memberAvatarUrl,
  }
}




