import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Area, Point } from 'react-easy-crop'
import { z } from 'zod'
import {
  changePasswordRequest,
  listSessionsRequest,
  requestEmailVerificationRequest,
  revokeSessionRequest,
} from '@/features/auth/api'
import { authKeys, strongPasswordSchema } from '@/features/auth/model'
import { parseApiError } from '@/features/auth/utils'
import { getCurrentAvatarRequest, uploadAvatarRequest } from '@/features/media/api'
import { useSessionStore } from '@/app/session/session-store'

const PAGE_SIZE = 2
const PAGE_BLOCK_SIZE = 5
const avatarQueryKey = (token: string) => ['media', 'avatar', 'current', token] as const

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Requerido'),
    new_password: strongPasswordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'Las contrasenas no coinciden',
    path: ['confirm'],
  })

export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>

export function useEmailVerificationRequest(accessToken: string) {
  return useMutation({
    mutationFn: async () => {
      try {
        return await requestEmailVerificationRequest(accessToken)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })
}

export function useSessionsSection(accessToken: string) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const sessionsQ = useQuery({
    queryKey: [...authKeys.sessions(), accessToken],
    queryFn: () => listSessionsRequest(accessToken),
    enabled: Boolean(accessToken),
  })

  const sessions = useMemo(() => sessionsQ.data?.data.sessions ?? [], [sessionsQ.data])

  const revokeMutation = useMutation({
    mutationFn: async (familyId: string) => {
      try {
        return await revokeSessionRequest(accessToken, familyId)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  })

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      try {
        const allFamilies = sessions.map((session) => session.family)
        await Promise.all(allFamilies.map((familyId) => revokeSessionRequest(accessToken, familyId)))
      } catch (error) {
        throw new Error(await parseApiError(error), { cause: error })
      }
    },
    onSuccess: () => {
      queryClient.clear()
      window.location.replace('/login')
    },
  })

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const pageStart = (pageSafe - 1) * PAGE_SIZE
  const pageSessions = sessions.slice(pageStart, pageStart + PAGE_SIZE)

  const pageWindow = useMemo(() => {
    const blockIndex = Math.floor((pageSafe - 1) / PAGE_BLOCK_SIZE)
    const start = blockIndex * PAGE_BLOCK_SIZE + 1
    const end = Math.min(start + PAGE_BLOCK_SIZE - 1, totalPages)
    const pages: number[] = []
    for (let p = start; p <= end; p += 1) pages.push(p)
    return pages
  }, [pageSafe, totalPages])

  return {
    pageSafe,
    pageSessions,
    pageWindow,
    revokeAllMutation,
    revokeMutation,
    sessions,
    sessionsQ,
    setPage,
    totalPages,
  }
}

export function useChangePasswordFlow(accessToken: string) {
  const queryClient = useQueryClient()
  const redirectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current != null) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  return useMutation({
    mutationFn: async (body: ChangePasswordPayload) => {
      try {
        await changePasswordRequest(accessToken, {
          old_password: body.old_password,
          new_password: body.new_password,
        })
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => {
      redirectTimeoutRef.current = window.setTimeout(() => {
        queryClient.clear()
        useSessionStore.getState().clearSession()
        window.location.replace('/login')
      }, 1200)
    },
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = url
  })
}

async function getCroppedFile(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar canvas para recorte')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.95)
  })
  if (!blob) throw new Error('No se pudo generar imagen recortada')
  return new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
}

export function useAccountProfileSection(accessToken: string) {
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const avatarQ = useQuery({
    queryKey: avatarQueryKey(accessToken),
    queryFn: () => getCurrentAvatarRequest(accessToken),
    retry: false,
  })

  const avatarUrl = useMemo(() => {
    const urls = avatarQ.data?.data.urls
    return urls?.['512'] ?? urls?.['256'] ?? urls?.['64'] ?? null
  }, [avatarQ.data])

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        return await uploadAvatarRequest(accessToken, file)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: avatarQueryKey(accessToken) })
      setSelectedImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    },
  })

  const verifyMutation = useEmailVerificationRequest(accessToken)

  const onCropComplete = (_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }

  const onAvatarFileSelect: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const src = URL.createObjectURL(file)
    setSelectedImageSrc(src)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    event.currentTarget.value = ''
  }

  const onSaveCroppedAvatar = async () => {
    if (!selectedImageSrc || !croppedAreaPixels) return
    const file = await getCroppedFile(selectedImageSrc, croppedAreaPixels)
    uploadAvatarMutation.mutate(file)
  }

  return {
    avatarInputRef,
    avatarQ,
    avatarUrl,
    crop,
    croppedAreaPixels,
    onAvatarFileSelect,
    onCropComplete,
    onSaveCroppedAvatar,
    photoViewerOpen,
    selectedImageSrc,
    setCrop,
    setPhotoViewerOpen,
    setSelectedImageSrc,
    setZoom,
    uploadAvatarMutation,
    verifyMutation,
    zoom,
  }
}

