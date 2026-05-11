export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  sessions: () => [...authKeys.all, 'sessions'] as const,
}

export const adminUsersKeys = {
  all: ['admin-users'] as const,
  list: (params: Record<string, string | number | boolean | undefined>) =>
    [...adminUsersKeys.all, 'list', params] as const,
}
