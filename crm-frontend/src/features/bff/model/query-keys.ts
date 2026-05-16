export const bffKeys = {
  all: ['bff'] as const,
  dashboard: () => [...bffKeys.all, 'dashboard'] as const,
  adminOverview: () => [...bffKeys.all, 'admin-overview'] as const,
}
