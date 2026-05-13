import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Lock, Plus, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserChip } from '@/components/molecules/user-chip'
import { parseApiError } from '@/auth/parse-api-error'
import { createTaskRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectMember, ProjectTask, ProjectTaskColumn } from '@/collab/collab.types'
import type { MeResponse } from '@/auth/auth.types'

type Subtask = { id: string; title: string; is_completed: boolean; assignee_sub: string | null }

type Props = {
  accessToken: string
  projectId: string
  columns: ProjectTaskColumn[]
  tasksByColumn: Record<string, ProjectTask[]>
  identity: MeResponse['data']
  members: ProjectMember[]
  open: boolean
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}

export function CreateTaskModal({
  accessToken,
  projectId,
  columns,
  tasksByColumn,
  identity,
  members,
  open,
  onClose,
  onCreated,
  onError,
}: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ProjectTask['priority']>('medium')
  const [columnId, setColumnId] = useState<string>('')
  const [deadline, setDeadline] = useState('')
  const [clientVis, setClientVis] = useState(false)
  const [selectedWorkerSubs, setSelectedWorkerSubs] = useState<string[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState<string>('none')

  const canAssign = identity.role === 'admin' || identity.role === 'worker'
  const workerMembers = members.filter((m) => m.role === 'worker' && Boolean(m.email))
  const selectedWorkers = workerMembers.filter((m) => selectedWorkerSubs.includes(m.userSub))

  useEffect(() => {
    if (columns.length > 0 && !columnId) setColumnId(columns[0].id)
  }, [columns, columnId])

  const createTask = useMutation({
    mutationFn: () =>
      createTaskRequest(accessToken, projectId, {
        column_id: columnId || columns[0]?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignees: selectedWorkers.map((w) => ({ user_sub: w.userSub, user_email: w.email! })),
        due_date: deadline || undefined,
        client_visible: clientVis,
        checklist_progress: 0,
        position: (tasksByColumn[columnId || columns[0]?.id] ?? []).length,
        subtasks,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
      handleClose()
      onCreated()
    },
    onError: (e) => parseApiError(e).then((m) => onError(m || 'No se pudo crear la tarea')),
  })

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDeadline('')
    setClientVis(false)
    setSelectedWorkerSubs([])
    setSubtasks([])
    setNewSubtask('')
    setNewSubtaskAssignee('none')
    onClose()
  }

  const canSubmit = title.trim().length >= 2 && !!columnId

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newSubtask.trim(),
        is_completed: false,
        assignee_sub: newSubtaskAssignee === 'none' ? null : newSubtaskAssignee,
      },
    ])
    setNewSubtask('')
    setNewSubtaskAssignee('none')
  }

  const getWorkerLabel = (sub: string | null) => {
    if (!sub) return null
    const worker = selectedWorkers.find((w) => w.userSub === sub)
    return worker ? worker.email : sub
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Completa los datos para crear la tarea en el tablero.</DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ct-title">Titulo <span className="text-destructive">*</span></Label>
            <Input id="ct-title" placeholder="Describe brevemente la tarea" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-col">Columna <span className="text-destructive">*</span></Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger id="ct-col"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map((column) => <SelectItem key={column.id} value={column.id}>{column.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-pri">Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as ProjectTask['priority'])}>
                <SelectTrigger id="ct-pri"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-desc">Descripcion</Label>
            <Textarea id="ct-desc" placeholder="Detalla que hay que hacer..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] resize-none" />
          </div>

          {canAssign && (
            <div className="space-y-1.5">
              <Label>Trabajadores asignados</Label>
              {selectedWorkers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {selectedWorkers.map((worker) => (
                    <UserChip
                      key={worker.userSub}
                      email={worker.email!}
                      onRemove={() => {
                        setSelectedWorkerSubs((prev) => prev.filter((sub) => sub !== worker.userSub))
                        setSubtasks((prev) => prev.map((subtask) => subtask.assignee_sub === worker.userSub ? { ...subtask, assignee_sub: null } : subtask))
                      }}
                    />
                  ))}
                </div>
              )}

              {workerMembers.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5 shrink-0" />
                  <span>Este proyecto no tiene trabajadores disponibles.</span>
                </div>
              ) : (
                <Select value="none" onValueChange={(value) => {
                  if (value === 'none') return
                  setSelectedWorkerSubs((prev) => (prev.includes(value) ? prev : [...prev, value]))
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un trabajador del proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {workerMembers
                      .filter((worker) => !selectedWorkerSubs.includes(worker.userSub))
                      .map((worker) => (
                        <SelectItem key={worker.userSub} value={worker.userSub}>{worker.email}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="ct-dead">Fecha limite</Label>
              <Input id="ct-dead" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="rounded accent-primary size-4" checked={clientVis} onChange={(e) => setClientVis(e.target.checked)} />
              <p className="text-xs font-medium">Visible al cliente</p>
            </label>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <CheckSquare className="size-3.5 text-muted-foreground" />
                Subtareas (Checklist)
              </Label>
              {!canAssign && <span className="text-[10px] text-muted-foreground">Solo admin/worker</span>}
            </div>

            {canAssign && selectedWorkers.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                <span>Asigna al menos un trabajador arriba para poder agregar subtareas.</span>
              </div>
            )}

            {canAssign && selectedWorkers.length > 0 && (
              <>
                {subtasks.length > 0 && (
                  <div className="space-y-2 mb-1">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 group text-sm rounded-lg border px-3 py-2 bg-muted/30">
                        <CheckSquare className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 break-words">{subtask.title}</span>
                        {subtask.assignee_sub && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                            <User className="size-2.5" />
                            {getWorkerLabel(subtask.assignee_sub)?.split('@')[0]}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => setSubtasks((prev) => prev.filter((entry) => entry.id !== subtask.id))}
                          title="Eliminar subtarea"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Descripcion de la subtarea..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                    className="h-8 text-sm"
                  />
                  <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
                    <SelectTrigger className="h-8 w-36 text-xs shrink-0">
                      <User className="size-3 mr-1 shrink-0" />
                      <SelectValue placeholder="Asignar a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {selectedWorkers.map((worker) => (
                        <SelectItem key={worker.userSub} value={worker.userSub}>
                          {worker.email?.split('@')[0] ?? worker.userSub.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" size="icon" className="size-8 shrink-0" disabled={!newSubtask.trim()} onClick={handleAddSubtask}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={createTask.isPending}>Cancelar</Button>
          <Button disabled={!canSubmit || createTask.isPending} onClick={() => createTask.mutate()}>
            {createTask.isPending ? 'Creando...' : 'Crear tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
