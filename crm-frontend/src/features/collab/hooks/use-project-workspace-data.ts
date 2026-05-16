import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBriefRequest,
  getProjectBoardRequest,
  listExternalChatRequest,
  listFormalChangeLogRequest,
  listInternalChatRequest,
} from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'

type WorkspaceTab = 'board' | 'chat' | 'brief' | 'members'

type Params = {
  accessToken: string
  projectId: string
  activeTab: WorkspaceTab
  isClient: boolean
}

async function fetchBriefPanel(accessToken: string, projectId: string) {
  const [briefRes, formalRes] = await Promise.all([
    getBriefRequest(accessToken, projectId),
    listFormalChangeLogRequest(accessToken, projectId),
  ])
  return {
    brief: briefRes.data ?? null,
    formalChanges: (formalRes.data.items ?? []).map((row) => ({
      id: row.id,
      title: row.description,
      status: 'approved' as const,
      createdAt: row.createdAt,
    })),
  }
}

export function useProjectWorkspaceData({ accessToken, projectId, activeTab, isClient }: Params) {
  const queryClient = useQueryClient()

  const boardQ = useQuery({
    queryKey: collabKeys.projectBoard(projectId),
    queryFn: () => getProjectBoardRequest(accessToken, projectId),
    staleTime: 30_000,
  })

  const briefQ = useQuery({
    queryKey: [...collabKeys.brief(projectId), 'panel'],
    queryFn: () => fetchBriefPanel(accessToken, projectId),
    enabled: activeTab === 'brief',
    staleTime: 60_000,
  })

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: collabKeys.chatExternal(projectId),
      queryFn: () => listExternalChatRequest(accessToken, projectId),
      staleTime: 15_000,
    })

    if (!isClient) {
      void queryClient.prefetchQuery({
        queryKey: collabKeys.chatInternal(projectId),
        queryFn: () => listInternalChatRequest(accessToken, projectId),
        staleTime: 15_000,
      })
    }

    void queryClient.prefetchQuery({
      queryKey: [...collabKeys.brief(projectId), 'panel'],
      queryFn: () => fetchBriefPanel(accessToken, projectId),
      staleTime: 60_000,
    })
  }, [accessToken, isClient, projectId, queryClient])

  return { boardQ, briefQ }
}


