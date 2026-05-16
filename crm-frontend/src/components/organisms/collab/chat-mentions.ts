import type { ProjectMember } from '@/features/collab/model'
import type { UserRole } from '@/shared/types'

const normalize = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const roleAliases: Record<ProjectMember['role'], string[]> = {
  admin: ['admin', 'administrador', 'administradores'],
  worker: ['worker', 'workers', 'trabajador', 'trabajadores'],
  client: ['client', 'clients', 'cliente', 'clientes'],
}

const allowedMentionRolesByActor = (role: UserRole): ProjectMember['role'][] => {
  if (role === 'admin') return ['admin', 'worker', 'client']
  if (role === 'worker') return ['worker', 'client']
  return ['worker']
}

const memberAliases = (member: ProjectMember) => {
  const local = (member.email ?? '').split('@')[0]
  const parts = local.split(/[._+-]/).filter(Boolean)
  const aliases = new Set<string>([local, ...parts].filter(Boolean).map(normalize))
  return [...aliases]
}

export function mentionHints(actorRole: UserRole): string[] {
  if (actorRole === 'admin') return ['@trabajador', '@cliente', '@administrador', '@nombre']
  if (actorRole === 'worker') return ['@trabajador', '@cliente', '@nombre']
  return ['@trabajador', '@nombre']
}

export function resolveMentionsFromBody(body: string, actorRole: UserRole, members: ProjectMember[]): string[] {
  const tokens = [...body.matchAll(/(?:^|\s)@([a-zA-Z0-9._-]+)/g)].map((m) => normalize(m[1]))
  if (!tokens.length) return []

  const allowedRoles = new Set(allowedMentionRolesByActor(actorRole))
  const result = new Set<string>()

  for (const token of tokens) {
    let matchedRole = null as ProjectMember['role'] | null
    for (const role of ['admin', 'worker', 'client'] as const) {
      if (roleAliases[role].includes(token)) matchedRole = role
    }
    if (matchedRole) {
      if (!allowedRoles.has(matchedRole)) continue
      for (const m of members) if (m.role === matchedRole) result.add(m.userSub)
      continue
    }

    for (const m of members) {
      if (!allowedRoles.has(m.role)) continue
      if (memberAliases(m).includes(token)) result.add(m.userSub)
    }
  }
  return [...result]
}

export type MentionSuggestion = {
  key: string
  value: string
  label: string
  kind: 'role' | 'member'
}

const roleLabel: Record<ProjectMember['role'], string> = {
  admin: 'Administradores',
  worker: 'Trabajadores',
  client: 'Clientes',
}

const memberLabel = (member: ProjectMember) => {
  const local = (member.email ?? member.userSub).split('@')[0]
  return local
}

export function extractActiveMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const upToCaret = text.slice(0, Math.max(0, caret))
  const match = upToCaret.match(/(^|\s)@([a-zA-Z0-9._-]*)$/)
  if (!match) return null
  const query = match[2] ?? ''
  return { start: upToCaret.length - query.length - 1, query }
}

export function buildMentionSuggestions(query: string, actorRole: UserRole, members: ProjectMember[]): MentionSuggestion[] {
  const q = normalize(query)
  const allowedRoles = new Set(allowedMentionRolesByActor(actorRole))
  const suggestions: MentionSuggestion[] = []

  for (const role of ['admin', 'worker', 'client'] as const) {
    if (!allowedRoles.has(role)) continue
    const aliases = roleAliases[role]
    if (q && !aliases.some((alias) => alias.includes(q))) continue
    suggestions.push({ key: `role-${role}`, value: aliases[1] ?? aliases[0], label: roleLabel[role], kind: 'role' })
  }

  for (const m of members) {
    if (!allowedRoles.has(m.role)) continue
    const aliases = memberAliases(m)
    if (q && !aliases.some((alias) => alias.includes(q))) continue
    suggestions.push({ key: `member-${m.userSub}`, value: memberLabel(m), label: `${memberLabel(m)} · ${m.role}`, kind: 'member' })
  }

  return suggestions.slice(0, 8)
}



