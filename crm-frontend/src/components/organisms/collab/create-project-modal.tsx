import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, User, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserSearch } from '@/components/molecules/user-search'
import { parseApiError } from '@/auth/parse-api-error'
import type { ClientSearchResult } from '@/auth/auth-api'
import { createProjectRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectType } from '@/collab/collab.types'

type Props = {
  accessToken: string
  open: boolean
  onClose: () => void
  onCreated: (projectId: string) => void
}

/** Organismo: modal para crear un nuevo proyecto con busqueda de cliente en tiempo real. */
export function CreateProjectModal({ accessToken, open, onClose, onCreated }: Props) {
  const queryClient = useQueryClient()
  const [name,           setName]           = useState('')
  const [description,    setDescription]    = useState('')
  const [brief,          setBrief]          = useState('')
  const [type,           setType]           = useState<ProjectType>('campaign_service')
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null)

  const createProject = useMutation({
    mutationFn: () =>
      createProjectRequest(accessToken, {
        name:        name.trim(),
        client_name: selectedClient?.email ?? '',
        type,
        description: description.trim() || `Proyecto de tipo ${type}`,
        brief:       brief.trim()       || 'Brief inicial del proyecto.',
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
      handleClose()
      onCreated(res.data.id)
    },
    onError: (e) => parseApiError(e).then((m) => setErrorMsg(m || 'No se pudo crear el proyecto')),
  })

  const handleClose = () => {
    setName(''); setDescription(''); setBrief(''); setType('campaign_service')
    setSelectedClient(null); setErrorMsg(null)
    onClose()
  }

  const canSubmit = name.trim().length >= 3 && !!selectedClient

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Completa los datos y asocia un cliente para crear el proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-name">Nombre del proyecto <span className="text-destructive">*</span></Label>
            <Input id="cp-name" placeholder="Describe brevemente el proyecto" value={name}
              onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-type">Tipo de proyecto <span className="text-destructive">*</span></Label>
            <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
              <SelectTrigger id="cp-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="campaign_service">Campana / Servicio</SelectItem>
                <SelectItem value="product_order">Pedido de Producto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Cliente <span className="text-destructive">*</span></Label>
            {selectedClient ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm truncate">{selectedClient.email}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">Cliente</Badge>
                </div>
                <button type="button" onClick={() => setSelectedClient(null)} aria-label="Quitar cliente"
                  className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <UserSearch
                accessToken={accessToken}
                role="client"
                selected={selectedClient ? [selectedClient] : []}
                onSelect={(u) => setSelectedClient(u)}
                placeholder="Busca por email del cliente…"
                queryKeyPrefix="client-search"
              />
            )}
            <p className="text-xs text-muted-foreground">Busca un usuario cliente registrado en el sistema.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-desc">Descripcion</Label>
            <Textarea id="cp-desc" placeholder="Describe el alcance del proyecto…" value={description}
              onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-brief">Brief inicial</Label>
            <Textarea id="cp-brief" placeholder="Objetivos, referencias, restricciones…" value={brief}
              onChange={(e) => setBrief(e.target.value)} className="min-h-[80px] resize-none" />
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={createProject.isPending}>Cancelar</Button>
          <Button disabled={!canSubmit || createProject.isPending} onClick={() => createProject.mutate()}>
            {createProject.isPending ? 'Creando…' : 'Crear proyecto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
