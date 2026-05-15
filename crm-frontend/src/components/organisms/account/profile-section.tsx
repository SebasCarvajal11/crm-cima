import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { CheckCircle2, Loader2, MailWarning, UserCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SectionIntro } from '@/components/molecules/section-intro'
import type { MeResponse } from '@/auth/auth.types'
import { requestEmailVerificationRequest } from '@/auth/auth-api'
import { parseApiError } from '@/auth/parse-api-error'
import { getCurrentAvatarRequest, uploadAvatarRequest } from '@/media/media-api'

type Props = {
  accessToken: string
  identity: MeResponse['data']
}

const avatarQueryKey = (token: string) => ['media', 'avatar', 'current', token] as const

const displayOrFallback = (value: string | null | undefined, fallback = 'No registrado') =>
  value?.trim() ? value : fallback

const roleLabel: Record<MeResponse['data']['role'], string> = {
  admin: 'Admin',
  worker: 'Trabajador',
  client: 'Cliente',
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

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.95)
  })

  if (!blob) throw new Error('No se pudo generar imagen recortada')
  return new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
}

export function ProfileSection({ accessToken, identity }: Props) {
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const isVerified = Boolean(identity.emailVerifiedAt)

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

  const verifyMutation = useMutation({
    mutationFn: async () => {
      try {
        return await requestEmailVerificationRequest(accessToken)
      } catch (e) {
        throw new Error(await parseApiError(e), { cause: e })
      }
    },
  })

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const onAvatarFileSelect: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
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

  return (
    <section className="space-y-4">
      <SectionIntro title="Mi Cuenta" description="Gestiona tu perfil, foto y estado de verificacion." />
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Perfil e identidad</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-5 text-sm">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-col items-center gap-3 lg:w-[22rem] lg:shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Opciones de foto de perfil"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar del usuario" className="size-64 rounded-full border object-cover shadow-sm" />
                    ) : (
                      <div className="flex size-64 items-center justify-center rounded-full border bg-muted">
                        <UserCircle2 className="size-24 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-52">
                  <DropdownMenuItem onClick={() => setPhotoViewerOpen(true)} disabled={!avatarUrl}>Ver foto</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => avatarInputRef.current?.click()} disabled={uploadAvatarMutation.isPending}>Cambiar foto de perfil</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onAvatarFileSelect}
                disabled={uploadAvatarMutation.isPending}
              />
              {uploadAvatarMutation.isPending && (
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                  <Loader2 className="size-3 animate-spin" />
                  Subiendo nueva foto...
                </p>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Nombres</p>
                  <p className="mt-1 font-medium">{displayOrFallback(identity.first_name)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Apellidos</p>
                  <p className="mt-1 font-medium">{displayOrFallback(identity.last_name)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Correo</p>
                  <p className="mt-1 font-medium break-all">{identity.email}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Rol</p>
                  <p className="mt-1 font-medium">{roleLabel[identity.role]}</p>
                </div>

                {identity.role === 'worker' && (
                  <div className="rounded-md border p-3 sm:col-span-2">
                    <p className="text-muted-foreground">Profesion</p>
                    <p className="mt-1 font-medium">{displayOrFallback(identity.profession)}</p>
                  </div>
                )}

                {identity.role === 'client' && (
                  <>
                    {identity.company_name?.trim() ? (
                      <div className="rounded-md border p-3 sm:col-span-2">
                        <p className="text-muted-foreground">Empresa</p>
                        <p className="mt-1 font-medium">{identity.company_name}</p>
                      </div>
                    ) : null}
                    <div className="rounded-md border p-3 sm:col-span-2">
                      <p className="text-muted-foreground">Tipo de cliente</p>
                      <p className="mt-1 font-medium">{displayOrFallback(identity.client_kind)}</p>
                    </div>
                  </>
                )}
              </div>

              <div className={isVerified ? 'rounded-md border border-emerald-200 bg-emerald-50/60 p-3' : 'rounded-md border border-amber-200 bg-amber-50/60 p-3'}>
                <div className="flex items-center gap-2">
                  {isVerified ? <CheckCircle2 className="size-4 text-emerald-600" /> : <MailWarning className="size-4 text-amber-700" />}
                  <p className="font-medium">Estado de verificacion</p>
                  <Badge className={isVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                    {isVerified ? 'Verificado' : 'Pendiente de verificacion'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isVerified
                    ? 'Tu cuenta ya cumple el requisito de verificacion de correo.'
                    : 'Debes verificar tu correo para completar la seguridad de la cuenta.'}
                </p>
                {!isVerified && (
                  <Button
                    type="button"
                    variant="default"
                    className="mt-3 h-9"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate()}
                  >
                    {verifyMutation.isPending ? 'Enviando...' : 'Enviar enlace de verificacion'}
                  </Button>
                )}
              </div>

              <div className="rounded-md border p-3">
                <p className="font-medium">Acceso y contrasena</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si no puedes ingresar o necesitas restablecer tu clave, gestiona la recuperacion desde aqui.
                </p>
                <Button asChild variant="outline" className="mt-3 h-9">
                  <Link to="/forgot-password">Recuperar contrasena</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        {uploadAvatarMutation.isError && (
          <CardContent className="border-t pt-4">
            <Alert variant="destructive">
              <AlertTitle>No se pudo actualizar el avatar</AlertTitle>
              <AlertDescription>{uploadAvatarMutation.error.message}</AlertDescription>
            </Alert>
          </CardContent>
        )}

        {verifyMutation.isSuccess && (
          <CardContent className="border-t pt-4">
            <Alert>
              <AlertTitle>Verificacion enviada</AlertTitle>
              <AlertDescription>
                {verifyMutation.data.message} Revisa tu correo y abre el enlace.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        {verifyMutation.isError && (
          <CardContent className="border-t pt-4">
            <Alert variant="destructive">
              <AlertTitle>No se pudo enviar la verificacion</AlertTitle>
              <AlertDescription>{verifyMutation.error.message}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>Vista previa de tu avatar actual.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center px-6 pb-6">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil actual" className="size-72 max-w-full rounded-full border object-cover shadow-sm" />
            ) : (
              <div className="flex size-72 max-w-full items-center justify-center rounded-full border bg-muted">
                <UserCircle2 className="size-20 text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedImageSrc)} onOpenChange={(open) => !open && setSelectedImageSrc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar foto de perfil</DialogTitle>
            <DialogDescription>
              Ajusta la posicion y el zoom para encuadrar tu avatar. Luego presiona Guardar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-2">
            <div className="relative h-[360px] w-full overflow-hidden rounded-lg border bg-black/80">
              {selectedImageSrc ? (
                <Cropper
                  image={selectedImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="avatar-zoom" className="text-sm text-muted-foreground">Zoom</label>
              <input
                id="avatar-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedImageSrc(null)} disabled={uploadAvatarMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => void onSaveCroppedAvatar()} disabled={!croppedAreaPixels || uploadAvatarMutation.isPending}>
              {uploadAvatarMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
