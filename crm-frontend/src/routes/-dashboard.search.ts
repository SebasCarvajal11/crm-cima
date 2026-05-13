export type DashboardTab = 'overview' | 'collab' | 'account' | 'admin'

export type DashboardSearch = {
  tab?: DashboardTab
  project_id?: string
  chat_channel?: 'internal' | 'external'
  chat_message_id?: string
}

export const parseDashboardSearch = (search: Record<string, unknown>): DashboardSearch => {
  const tab = search.tab
  return {
    tab:
      tab === 'overview' || tab === 'collab' || tab === 'account' || tab === 'admin'
        ? tab
        : undefined,
    project_id: typeof search.project_id === 'string' ? search.project_id : undefined,
    chat_channel: search.chat_channel === 'internal' || search.chat_channel === 'external'
      ? search.chat_channel
      : undefined,
    chat_message_id: typeof search.chat_message_id === 'string' ? search.chat_message_id : undefined,
  }
}