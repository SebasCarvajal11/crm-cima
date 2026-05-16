export const adminUsersKeys = {
  all: ['admin-users'] as const,
  list: (params: Record<string, string | number | boolean | undefined>) =>
    [...adminUsersKeys.all, 'list', params] as const,
}

export type { AdminUserRow, UserRole } from '@/shared/types'
