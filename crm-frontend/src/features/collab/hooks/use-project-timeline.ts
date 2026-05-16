import { useQuery } from '@tanstack/react-query'
import { listProjectTimelineRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { ProjectTimelineItem } from '@/features/collab/model'

type Params = {
  accessToken: string
  projectId: string
}

export function useProjectTimeline({ accessToken, projectId }: Params) {
  const timelineQ = useQuery({
    queryKey: collabKeys.timeline(projectId),
    queryFn: () => listProjectTimelineRequest(accessToken, projectId),
  })

  const timeline = (timelineQ.data?.data ?? []) as ProjectTimelineItem[]

  return { timelineQ, timeline }
}


