import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/shared/lib'
import { listTaskFilesRequest, uploadTaskFileRequest } from '@/features/collab/api'
import { collabKeys } from '@/features/collab/model'
import { uploadDocumentRequest } from '@/features/media/api'
import type { ProjectFile } from '@/features/collab/model'

type Params = {
  accessToken: string
  projectId: string
  taskId: string
  onError: (msg: string) => void
  setFileError: (msg: string | null) => void
  resetForm: () => void
}

type UploadInput = {
  selectedFile: File | null
  fileTitle: string
  fileDesc: string
}

export function useTaskFiles({ accessToken, projectId, taskId, onError, setFileError, resetForm }: Params) {
  const queryClient = useQueryClient()

  const filesQ = useQuery({
    queryKey: collabKeys.taskFiles(taskId),
    queryFn: () => listTaskFilesRequest(accessToken, projectId, taskId),
  })

  const files = (filesQ.data?.data ?? []) as ProjectFile[]

  const upload = useMutation({
    mutationFn: (input: UploadInput) => {
      if (!input.selectedFile) throw new Error('No hay archivo seleccionado')
      return uploadDocumentRequest(accessToken, input.selectedFile).then((mediaRes) =>
        uploadTaskFileRequest(accessToken, projectId, taskId, input.fileTitle.trim(), input.fileDesc.trim(), {
          fileName: input.selectedFile!.name,
          storagePath: mediaRes.data.objectKey,
          mimeType: input.selectedFile!.type || 'application/octet-stream',
          sizeBytes: input.selectedFile!.size,
          isClientVisible: false,
        }),
      )
    },
    onSuccess: () => {
      resetForm()
      void queryClient.invalidateQueries({ queryKey: collabKeys.taskFiles(taskId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.files(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.timeline(projectId) })
    },
    onError: (error) => {
      void parseApiError(error).then((m) => {
        setFileError(m || 'No se pudo subir el archivo')
        onError(m || 'Error al subir archivo')
      })
    },
  })

  return { filesQ, files, upload }
}




