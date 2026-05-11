import { Crown, Briefcase, User, CheckSquare2, Users } from 'lucide-react'
import type { ProjectMember, ProjectMemberRole } from '@/collab/collab.types'

type Props = {
  members: ProjectMember[]
  isLoading: boolean
}

const ROLE_CONFIG: Record<ProjectMemberRole, {
  label: string
  labelPlural: string
  icon: React.ReactNode
  badgeClass: string
  cardClass: string
  order: number
}> = {
  admin: {
    label: 'Administrador', labelPlural: 'Administradores',
    icon: <Crown    className="size-3.5" />,
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    cardClass:  'border-l-violet-400',
    order: 0,
  },
  worker: {
    label: 'Trabajador', labelPlural: 'Trabajadores',
    icon: <Briefcase className="size-3.5" />,
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    cardClass:  'border-l-sky-400',
    order: 1,
  },
  client: {
    label: 'Cliente', labelPlural: 'Clientes',
    icon: <User className="size-3.5" />,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cardClass:  'border-l-emerald-400',
    order: 2,
  },
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
]

function getAvatarColor(sub: string) {
  let hash = 0
  for (let i = 0; i < sub.length; i++) hash = (sub.charCodeAt(i) + ((hash << 5) - hash)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(email: string | null) {
  if (!email) return '?'
  const name = email.split('@')[0]
  const parts = name.split(/[._\-+]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Organismo: panel de integrantes del proyecto con rol, email y contador de tareas. */
export function ProjectMembers({ members, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20" role="status" aria-label="Cargando integrantes">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Users className="size-10 opacity-20" />
        <p className="text-sm">No hay integrantes en este proyecto.</p>
      </div>
    )
  }

  const byRole = members.reduce<Record<ProjectMemberRole, ProjectMember[]>>(
    (acc, m) => { acc[m.role] = [...(acc[m.role] ?? []), m]; return acc },
    { admin: [], worker: [], client: [] }
  )

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-muted/40 border">
        {(['admin', 'worker', 'client'] as ProjectMemberRole[]).map((role) => {
          const cfg = ROLE_CONFIG[role]
          const count = byRole[role]?.length ?? 0
          if (count === 0) return null
          return (
            <div key={role} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${cfg.badgeClass}`}>
              {cfg.icon}
              <span>{count} {count === 1 ? cfg.label : cfg.labelPlural}</span>
            </div>
          )
        })}
        <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-background text-muted-foreground ml-auto">
          <Users className="size-3.5" />
          <span>{members.length} en total</span>
        </div>
      </div>

      {/* Members grouped by role */}
      {(['admin', 'worker', 'client'] as ProjectMemberRole[]).map((role) => {
        const group = byRole[role]
        if (!group?.length) return null
        const cfg = ROLE_CONFIG[role]
        return (
          <div key={role}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badgeClass}`}>
                {cfg.icon}
                {cfg.labelPlural}
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{group.length}</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.map((m) => {
                const avatarColor = getAvatarColor(m.userSub)
                const initials = getInitials(m.email)
                const displayName = m.email ?? 'Sin email registrado'
                const displayNameShort = m.email
                  ? m.email.split('@')[0]
                  : m.userSub.slice(0, 16) + '…'

                return (
                  <div
                    key={m.userSub}
                    className={`flex items-center gap-3 rounded-xl border border-l-4 bg-card px-4 py-3 shadow-sm hover:shadow-md transition-shadow ${cfg.cardClass}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`${avatarColor} size-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 select-none`}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" title={displayName}>
                        {displayNameShort}
                      </p>
                      {m.email && (
                        <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Desde {new Date(m.createdAt).toLocaleDateString('es', { dateStyle: 'medium' })}
                      </p>
                    </div>

                    {/* Task count */}
                    <div
                      className="shrink-0 flex flex-col items-center gap-0.5 min-w-[2.5rem]"
                      title={`${m.taskCount} tarea${m.taskCount !== 1 ? 's' : ''} asignada${m.taskCount !== 1 ? 's' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        <CheckSquare2 className="size-3.5 text-muted-foreground" />
                        <span className={`text-base font-bold leading-none ${m.taskCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {m.taskCount}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {m.taskCount === 1 ? 'tarea' : 'tareas'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
