import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, CheckSquare2, Clock3, Crown, Mail, Plus, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserSearch } from '@/components/molecules/user-search'
import { UserChip } from '@/components/molecules/user-chip'
import { parseApiError } from '@/auth/parse-api-error'
import { listProjectMembersRequest, upsertProjectMemberRequest } from '@/collab/collab-api'
import { collabKeys } from '@/collab/query-keys'
import type { ProjectMember, ProjectMemberRole } from '@/collab/collab.types'
import type { ClientSearchResult } from '@/auth/auth-api'
import type { MeResponse } from '@/auth/auth.types'
import { getCurrentAvatarRequest, getUserAvatarsRequest } from '@/media/media-api'
import { pickAvatarUrl } from '@/media/avatar-utils'

type Props = {
  members: ProjectMember[]
  isLoading: boolean
  accessToken: string
  projectId: string
  identity: MeResponse['data']
  canManageMembers: boolean
  onError: (msg: string) => void
}

const ROLE_CONFIG: Record<ProjectMemberRole, { label: string; icon: React.ReactNode; badgeClass: string; cardClass: string }> = {
  admin: {
    label: 'Administrador',
    icon: <Crown className="size-3.5" />,
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    cardClass: 'border-l-violet-400',
  },
  worker: {
    label: 'Trabajador',
    icon: <Briefcase className="size-3.5" />,
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    cardClass: 'border-l-sky-400',
  },
  client: {
    label: 'Cliente',
    icon: <User className="size-3.5" />,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cardClass: 'border-l-emerald-400',
  },
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

function getAvatarColor(sub: string) {
  let hash = 0
  for (let i = 0; i < sub.length; i++) hash = (sub.charCodeAt(i) + ((hash << 5) - hash)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getDisplayName(member: ProjectMember) {
  const full = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
  if (full) return full
  if (member.role === 'client' && member.client_kind === 'juridical' && member.company_name) return member.company_name
  return member.email || 'Sin nombre registrado'
}

function getInitials(member: ProjectMember) {
  const full = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return member.email ? member.email.slice(0, 2).toUpperCase() : '?'
}

function getRoleDetail(member: ProjectMember) {
  if (member.role === 'worker') return member.profession?.trim() || 'Profesion no registrada'
  if (member.role === 'client' && member.client_kind === 'juridical') return 'Cliente juridico'
  return ROLE_CONFIG[member.role].label
}

function formatDateLabel(iso: string | null) {
  if (!iso) return 'Sin registro'
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}

function getRelativeActivityLabel(iso: string | null) {
  if (!iso) return 'Sin registro'
  const now = new Date()
  const then = new Date(iso)
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
  const days = Math.floor((startNow - startThen) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} dias`
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) === 1 ? '' : 's'}`
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) === 1 ? '' : 'es'}`
  return `Hace ${Math.floor(days / 365)} ano${Math.floor(days / 365) === 1 ? '' : 's'}`
}

export function ProjectMembers({ members, isLoading, accessToken, projectId, identity, canManageMembers, onError }: Props) {
  const queryClient = useQueryClient()
  const [selectedWorkers, setSelectedWorkers] = useState<ClientSearchResult[]>([])

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
      setSelectedWorkers([])
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectMembers(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projectBoard(projectId) })
      void queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
    },
    onError: (e) => parseApiError(e).then((m) => onError(m || 'No se pudo agregar trabajador al proyecto')),
  })

  if (isLoading || membersQ.isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>
  }
  if (resolvedMembers.length === 0) {
    return <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground"><Users className="size-10 opacity-20" /><p className="text-sm">No hay integrantes en este proyecto.</p></div>
  }

  const memberSubs = new Set(resolvedMembers.map((m) => m.userSub))
  const filteredSelection = selectedWorkers.filter((w) => !memberSubs.has(w.subject))
  const byRole = resolvedMembers.reduce<Record<ProjectMemberRole, ProjectMember[]>>((acc, member) => {
    acc[member.role] = [...acc[member.role], member]
    return acc
  }, { admin: [], worker: [], client: [] })

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Agregar trabajador</h3>
            <Button size="sm" onClick={() => addWorker.mutate()} disabled={filteredSelection.length === 0 || addWorker.isPending}>
              <Plus className="mr-1 size-4" />
              {addWorker.isPending ? 'Agregando...' : 'Agregar trabajador'}
            </Button>
          </div>

          {filteredSelection.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filteredSelection.map((worker) => (
                <UserChip key={worker.subject} email={worker.email} onRemove={() => setSelectedWorkers((prev) => prev.filter((x) => x.subject !== worker.subject))} />
              ))}
            </div>
          )}

          <UserSearch
            accessToken={accessToken}
            role="worker"
            selected={filteredSelection}
            onSelect={(worker) => {
              if (memberSubs.has(worker.subject)) return
              setSelectedWorkers((prev) => prev.some((w) => w.subject === worker.subject) ? prev : [...prev, worker])
            }}
            placeholder="Buscar trabajador por email..."
            queryKeyPrefix="project-member-worker"
          />
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(['admin', 'worker', 'client'] as ProjectMemberRole[]).map((role) => {
            const count = byRole[role].length
            if (count === 0) return null
            const cfg = ROLE_CONFIG[role]
            return (
              <span key={role} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${cfg.badgeClass}`}>
                {cfg.icon}
                {cfg.label}: {count}
              </span>
            )
          })}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5" />
            {resolvedMembers.length} en total
          </span>
        </div>
      </div>

      {(['admin', 'worker', 'client'] as ProjectMemberRole[]).map((role) => {
        const group = byRole[role]
        if (!group.length) return null
        const cfg = ROLE_CONFIG[role]
        return (
          <section key={role} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.badgeClass}`}>
                {cfg.icon}
                {cfg.label}
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((member) => {
                const displayName = getDisplayName(member)
                const showEmailLine = Boolean(member.email && member.email !== displayName)
                const fallbackToCurrentUserAvatar = member.email === identity.email ? currentUserAvatarUrl : null
                const memberAvatarUrl = pickAvatarUrl(avatarBySub[member.userSub]?.urls, '64') ?? fallbackToCurrentUserAvatar
                return (
                  <article key={member.userSub} className={`rounded-xl border border-l-4 bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${cfg.cardClass}`}>
                    <div className="flex items-start gap-3">
                      <div className={`${getAvatarColor(member.userSub)} flex size-10 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white`}>
                        {memberAvatarUrl ? (
                          <img src={memberAvatarUrl} alt={`Avatar de ${displayName}`} className="size-10 object-cover" />
                        ) : (
                          getInitials(member)
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-semibold" title={displayName}>{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{cfg.label} · {getRoleDetail(member)}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {showEmailLine && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </p>
                      )}
                      <p>Desde: {formatDateLabel(member.createdAt)}</p>
                      {member.role !== 'admin' && (
                        <p>
                          Ultima actividad: {getRelativeActivityLabel(member.lastSeenAt)}
                          {member.lastSeenAt ? <span className="ml-1 text-[10px]">({formatDateLabel(member.lastSeenAt)})</span> : null}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-3 border-t pt-2.5 text-xs text-muted-foreground">
                      {member.role !== 'admin' && (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          Activo en proyecto
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CheckSquare2 className="size-3.5" />
                        <strong className="text-foreground">{member.taskCount}</strong>
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
