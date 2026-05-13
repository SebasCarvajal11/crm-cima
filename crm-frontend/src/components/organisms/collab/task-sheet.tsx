import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Calendar, FileText, Lock, Paperclip, Pencil, MessageSquare, User, X, CheckSquare, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { UserChip } from '@/components/molecules/user-chip'
import { PriorityBadge, PRIORITY_CONFIG } from '@/components/molecules/priority-badge'
import { parseApiError } from '@/auth/parse-api-error'
import { patchTaskRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import { TaskComments } from './task-comments'
import { TaskFilesTab } from './task-files-tab'
import type { ClientSearchResult } from '@/auth/auth-api'
import type { ProjectMember, ProjectTask, ProjectTaskColumn } from '@/collab/collab.types'

type Tab = 'info' | 'comments' | 'files'

type Props = {
  task: ProjectTask
  canEdit: boolean
  accessToken: string
  projectId: string
  members: ProjectMember[]
  columns: ProjectTaskColumn[]
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}

/** Organismo: contenido del Sheet lateral de detalle de tarea (tabs: detalle, comentarios, archivos). */
export function TaskSheet({ task, canEdit, accessToken, projectId, members, columns, onClose, onSaved, onError }: Props) {
  const [tab,          setTab]          = useState<Tab>('info')
  const [editing,      setEditing]      = useState(false)
  const [editTitle,    setEditTitle]    = useState(task.title)
  const [editDesc,     setEditDesc]     = useState(task.description ?? '')
  const [editPriority, setEditPriority] = useState(task.priority)
  const [editVisible,  setEditVisible]  = useState(task.isClientVisible)
  const [editDeadline, setEditDeadline] = useState(task.deadline?.slice(0, 10) ?? '')
  const [editColumnId, setEditColumnId] = useState(task.columnId)
  const [editWorkers,  setEditWorkers]  = useState<ClientSearchResult[]>([])

  const [newSubtask,         setNewSubtask]         = useState('')
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState<string>('none')
  const queryClient = useQueryClient()

  const assignableMembers = members.filter((m) => m.role === 'worker' && Boolean(m.email))

  useEffect(() => {
    setEditing(false); setTab('info')
    setEditTitle(task.title); setEditDesc(task.description ?? '')
    setEditPriority(task.priority); setEditVisible(task.isClientVisible)
    setEditDeadline(task.deadline?.slice(0, 10) ?? '')
    setEditColumnId(task.columnId)
    setEditWorkers([])
    setNewSubtask(''); setNewSubtaskAssignee('none')
  }, [task.id])

  const save = useMutation({
    mutationFn: (subtasks?: { id: string; title: string; is_completed: boolean; assignee_sub: string | null }[]) =>
      patchTaskRequest(accessToken, task.id, {
        title:          editTitle.trim(),
        description:    editDesc.trim() || null,
        priority:       editPriority,
        client_visible: editVisible,
        column_id:      editColumnId !== task.columnId ? editColumnId : undefined,
        due_date:       editDeadline || null,
        assignees:      editWorkers.length > 0
          ? editWorkers.map(w => ({ user_sub: w.subject, user_email: w.email }))
          : undefined,
        subtasks,
      }),
    onSuccess: (_, variables) => {
      setEditing(false)
      if (variables === undefined) {
        onSaved()
      } else {
        void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
      }
    },
    onError: (e) => parseApiError(e).then((m) => onError(m || 'No se pudo guardar')),
  })

  // â”€â”€ Subtask handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Bloquear agregar subtarea si no hay asignado seleccionado */
  const canAddSubtask = newSubtask.trim().length > 0 && newSubtaskAssignee !== 'none'

  const handleAddSubtask = () => {
    if (!canAddSubtask) return
    const current = task.subtasks
      ? task.subtasks.map(s => ({ id: s.id, title: s.title, is_completed: s.isCompleted, assignee_sub: s.assigneeSub ?? null }))
      : []
    const updated = [...current, {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      is_completed: false,
      assignee_sub: newSubtaskAssignee,
    }]
    save.mutate(updated)
    setNewSubtask('')
    setNewSubtaskAssignee('none')
  }

  const handleToggleSubtask = (id: string, isCompleted: boolean) => {
    if (!task.subtasks) return
    const updated = task.subtasks.map(s => ({
      id: s.id,
      title: s.title,
      is_completed: s.id === id ? isCompleted : s.isCompleted,
      assignee_sub: s.assigneeSub ?? null,
    }))
    save.mutate(updated)
  }

  const handleDeleteSubtask = (id: string) => {
    if (!task.subtasks) return
    const updated = task.subtasks
      .filter(s => s.id !== id)
      .map(s => ({ id: s.id, title: s.title, is_completed: s.isCompleted, assignee_sub: s.assigneeSub ?? null }))
    save.mutate(updated)
  }

  const getMemberLabel = (sub: string | null | undefined) => {
    if (!sub) return null
    const m = assignableMembers.find(m => m.userSub === sub)
    return m?.email ? m.email.split('@')[0] : sub.slice(0, 8)
  }

  const p = PRIORITY_CONFIG[editing ? editPriority : task.priority]

  return (
    <>
      <SheetHeader className="px-5 pt-5 pb-3 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-base font-semibold leading-snug line-clamp-2">{task.title}</SheetTitle>
            <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={task.priority} size="xs" />
              {task.isClientVisible && (
                <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 gap-1">
                  <User className="size-3" aria-hidden="true" />Visible al cliente
                </span>
              )}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && !editing && (
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(true)} aria-label="Editar tarea">
                <Pencil className="size-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Cerrar panel">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-0.5 mt-2 border-b -mx-5 px-5 pb-0" role="tablist" aria-label="Secciones de la tarea">
          {([
            { key: 'info' as const,     label: 'Detalle',     icon: <FileText     className="size-3.5" /> },
            { key: 'comments' as const, label: 'Comentarios', icon: <MessageSquare className="size-3.5" /> },
            { key: 'files' as const,    label: 'Archivos',    icon: <Paperclip    className="size-3.5" /> },
          ]).map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none rounded-t whitespace-nowrap',
                tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}>
              <span aria-hidden="true">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === 'info' && (
          !editing ? (
            /* â”€â”€ VISTA DE DETALLE â”€â”€ */
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descripcion</p>
                {task.description
                  ? <p className="text-sm leading-relaxed">{task.description}</p>
                  : <p className="text-sm text-muted-foreground italic">Sin descripcion.</p>}
              </div>
              <Separator />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Prioridad</dt>
                  <dd><span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>{p.label}</span></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Visible al cliente</dt>
                  <dd className="font-medium">{task.isClientVisible ? 'SÃ­' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Creada</dt>
                  <dd className="text-muted-foreground text-xs">
                    {new Date(task.createdAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Actualizada</dt>
                  <dd className="text-muted-foreground text-xs">
                    {new Date(task.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                  </dd>
                </div>
                {task.deadline && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground mb-1">Fecha lÃ­mite</dt>
                    <dd className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {new Date(task.deadline).toLocaleDateString('es', { dateStyle: 'long' })}
                    </dd>
                  </div>
                )}
              </dl>
              <Separator />

              {/* â”€â”€ SUBTAREAS â”€â”€ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <CheckSquare className="size-3.5" />
                    Subtareas
                  </p>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {task.checklistProgress}%
                    </span>
                  )}
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-in-out"
                      style={{ width: `${task.checklistProgress}%` }}
                    />
                  </div>
                )}

                <div className="space-y-2 mt-1">
                  {task.subtasks?.map((sub) => (
                    <div key={sub.id} className="flex items-start gap-2 group rounded-md py-1">
                      <input
                        type="checkbox"
                        checked={sub.isCompleted}
                        disabled={!canEdit || save.isPending}
                        onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                        className="size-4 accent-primary rounded cursor-pointer shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm break-words transition-colors ${sub.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {sub.title}
                        </span>
                        {sub.assigneeSub && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="size-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground truncate">
                              {getMemberLabel(sub.assigneeSub)}
                            </span>
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost" size="icon"
                          className="size-6 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSubtask(sub.id)}
                          disabled={save.isPending}
                          title="Eliminar subtarea"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {canEdit && (
                    assignableMembers.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                        <Lock className="size-3.5 shrink-0" />
                        <span>El proyecto no tiene trabajadores asignados.</span>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleAddSubtask() }}
                        className="space-y-2 pt-1 border-t mt-2"
                      >
                        {/* Primero el selector de asignado */}
                        <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
                          <SelectTrigger className="h-8 text-xs w-full">
                            <User className="size-3 mr-1 shrink-0" />
                            <SelectValue placeholder="1. Elige quiÃ©n la harÃ¡â€¦" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>â€” Seleccionar trabajador â€”</SelectItem>
                            {assignableMembers.map((m) => (
                              <SelectItem key={m.userSub} value={m.userSub}>
                                {m.email ? m.email.split('@')[0] : m.userSub.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Luego el input + botÃ³n */}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder={newSubtaskAssignee === 'none'
                              ? 'Primero elige un trabajador arribaâ€¦'
                              : '2. Describe la subtareaâ€¦'}
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            className="h-8 text-sm"
                            disabled={save.isPending || newSubtaskAssignee === 'none'}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            className="size-8 shrink-0"
                            disabled={!canAddSubtask || save.isPending}
                            title={newSubtaskAssignee === 'none' ? 'Primero elige un trabajador' : 'Agregar subtarea'}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>

                        {newSubtaskAssignee === 'none' && (
                          <p className="text-[10px] text-amber-600 flex items-center gap-1">
                            <AlertCircle className="size-3 shrink-0" />
                            Selecciona un trabajador antes de agregar la subtarea
                          </p>
                        )}
                      </form>
                    )
                  )}
                </div>
              </div>

              {canEdit && (
                <>
                  <Separator />
                  <Button className="w-full" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="size-4 mr-2" />Editar tarea
                  </Button>
                </>
              )}
            </div>
          ) : (
            /* â”€â”€ MODO EDICIÃ“N â”€â”€ */
            <div className="space-y-4">
              {/* TÃ­tulo */}
              <div className="space-y-1.5">
                <Label htmlFor="et-title" className="text-xs font-medium">TÃ­tulo <span className="text-destructive">*</span></Label>
                <Input id="et-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>

              {/* DescripciÃ³n */}
              <div className="space-y-1.5">
                <Label htmlFor="et-desc" className="text-xs font-medium">DescripciÃ³n</Label>
                <Textarea id="et-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  className="min-h-[100px] resize-none" />
              </div>

              {/* Columna + Prioridad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="et-col" className="text-xs font-medium">Columna</Label>
                  <Select value={editColumnId} onValueChange={setEditColumnId}>
                    <SelectTrigger id="et-col"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="et-pri" className="text-xs font-medium">Prioridad</Label>
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as ProjectTask['priority'])}>
                    <SelectTrigger id="et-pri"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fecha lÃ­mite */}
              <div className="space-y-1.5">
                <Label htmlFor="et-dead" className="text-xs font-medium">Fecha lÃ­mite</Label>
                <Input id="et-dead" type="date" value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)} />
              </div>

              {/* Trabajadores asignados */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Trabajadores asignados</Label>
                <p className="text-[11px] text-muted-foreground">Solo puedes asignar trabajadores del proyecto.</p>
                {editWorkers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {editWorkers.map((w) => (
                      <UserChip key={w.subject} email={w.email}
                        onRemove={() => setEditWorkers((p) => p.filter((x) => x.subject !== w.subject))} />
                    ))}
                  </div>
                )}
                {assignableMembers.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" />
                    <span>Este proyecto no tiene trabajadores disponibles.</span>
                  </div>
                ) : (
                  <Select value="none" onValueChange={(value) => {
                    if (value === 'none') return
                    const worker = assignableMembers.find((m) => m.userSub === value)
                    if (!worker?.email) return
                    setEditWorkers((prev) => prev.some((existing) => existing.subject === worker.userSub)
                      ? prev
                      : [...prev, { subject: worker.userSub, email: worker.email!, role: 'worker' }])
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona trabajador del proyecto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleccionar...</SelectItem>
                      {assignableMembers
                        .filter((m) => !editWorkers.some((w) => w.subject === m.userSub))
                        .map((m) => (
                          <SelectItem key={m.userSub} value={m.userSub}>
                            {m.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Visible al cliente */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <input type="checkbox" className="rounded accent-primary size-4" checked={editVisible}
                  onChange={(e) => setEditVisible(e.target.checked)} />
                <div>
                  <p className="text-sm font-medium">Visible para el cliente</p>
                  <p className="text-xs text-muted-foreground">El cliente podrÃ¡ ver esta tarea</p>
                </div>
              </label>

              <Separator />
              <div className="flex gap-2">
                <Button className="flex-1" disabled={editTitle.trim().length < 2 || save.isPending}
                  onClick={() => save.mutate(undefined)}>
                  {save.isPending ? 'Guardandoâ€¦' : 'Guardar cambios'}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          )
        )}
        {tab === 'comments' && (
          <TaskComments accessToken={accessToken} projectId={projectId} taskId={task.id} onError={onError} />
        )}
        {tab === 'files' && (
          <TaskFilesTab accessToken={accessToken} projectId={projectId} taskId={task.id} canUpload={canEdit} onError={onError} />
        )}
      </div>
    </>
  )
}


