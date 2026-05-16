import { useQuery } from '@tanstack/react-query'
import { listProjectFilesEnrichedRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import type { ProjectFileEnriched } from '@/features/collab/model'

type Params = {
  accessToken: string
  projectId: string
}

export function useProjectFiles({ accessToken, projectId }: Params) {
  const filesQ = useQuery({
    queryKey: collabKeys.files(projectId),
    queryFn: () => listProjectFilesEnrichedRequest(accessToken, projectId),
  })

  const files = (filesQ.data?.data.items ?? []) as ProjectFileEnriched[]

  return { filesQ, files }
}


