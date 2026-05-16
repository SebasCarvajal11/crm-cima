import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminListUsersRequest,
  adminPatchUserFlagsRequest,
  adminPatchUserStatusRequest,
  adminRestoreUserRequest,
  adminSoftDeleteUserRequest,
} from '@/features/admin/api'
import { adminUsersKeys, type AdminUserRow, type UserRole } from '@/features/admin/model'
import { parseApiError } from '@/features/admin/utils'

const PAGE_BLOCK_SIZE = 5
const DEFAULT_LIMIT = 2
const FETCH_LIMIT = 100

type ActionPayload =
  | { subject: string; is_active: boolean }
  | { subject: string; force_password_change: boolean }
  | string

export function useAdminUsersTable(accessToken: string) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [actionsMessage, setActionsMessage] = useState<string | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 220)
    return () => window.clearTimeout(timeout)
  }, [search])

  const listParams = { page: 1, limit: FETCH_LIMIT, include_deleted: true }

  const usersQ = useQuery({
    queryKey: adminUsersKeys.list(listParams),
    queryFn: () => adminListUsersRequest(accessToken, listParams),
    enabled: Boolean(accessToken),
  })

  const mutationOptions = <T extends ActionPayload>(fn: (arg: T) => Promise<{ message: string }>) => ({
    mutationFn: (arg: T) => fn(arg).catch(async (error) => {
      throw new Error(await parseApiError(error), { cause: error })
    }),
    onSuccess: (data: { message: string }) => {
      setActionsMessage(data.message)
      void queryClient.invalidateQueries({ queryKey: adminUsersKeys.all })
    },
    onError: () => setActionsMessage(null),
  })

  const patchStatus = useMutation(
    mutationOptions(({ subject, is_active }: { subject: string; is_active: boolean }) =>
      adminPatchUserStatusRequest(accessToken, subject, { is_active }))
  )
  const patchFlags = useMutation(
    mutationOptions(({ subject, force_password_change }: { subject: string; force_password_change: boolean }) =>
      adminPatchUserFlagsRequest(accessToken, subject, { force_password_change }))
  )
  const softDelete = useMutation(mutationOptions((subject: string) => adminSoftDeleteUserRequest(accessToken, subject)))
  const restore = useMutation(mutationOptions((subject: string) => adminRestoreUserRequest(accessToken, subject)))

  const filteredItems = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase()
    const sourceItems = usersQ.data?.data.items ?? []
    return sourceItems.filter((row) => {
      if (!includeDeleted && row.deleted_at) return false
      if (roleFilter !== 'all' && row.role !== roleFilter) return false
      if (!needle) return true
      const fullName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
      return (
        row.email.toLowerCase().includes(needle) ||
        fullName.toLowerCase().includes(needle) ||
        (row.company_name ?? '').toLowerCase().includes(needle) ||
        (row.first_name ?? '').toLowerCase().includes(needle) ||
        (row.last_name ?? '').toLowerCase().includes(needle)
      )
    })
  }, [usersQ.data?.data.items, includeDeleted, roleFilter, debouncedSearch])

  const totalPages = Math.ceil(filteredItems.length / DEFAULT_LIMIT)
  const pageSafe = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const pageStart = (pageSafe - 1) * DEFAULT_LIMIT
  const items = filteredItems.slice(pageStart, pageStart + DEFAULT_LIMIT)

  const pageWindow = useMemo(() => {
    if (totalPages <= 0) return []
    const blockIndex = Math.floor((Math.max(pageSafe, 1) - 1) / PAGE_BLOCK_SIZE)
    const start = blockIndex * PAGE_BLOCK_SIZE + 1
    const end = Math.min(start + PAGE_BLOCK_SIZE - 1, totalPages)
    const pages: number[] = []
    for (let p = start; p <= end; p += 1) pages.push(p)
    return pages
  }, [pageSafe, totalPages])

  const actionsError = patchStatus.error ?? patchFlags.error ?? softDelete.error ?? restore.error

  return {
    actionsError,
    actionsMessage,
    filteredItems,
    includeDeleted,
    items,
    pageSafe,
    pageWindow,
    patchFlags,
    patchStatus,
    restore,
    roleFilter,
    search,
    setActionsMessage,
    setIncludeDeleted,
    setPage,
    setRoleFilter,
    setSearch,
    softDelete,
    totalPages,
    usersQ,
  }
}

export function userDisplayName(row: AdminUserRow) {
  const fullName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
  if (row.role === 'client' && row.company_name) return row.company_name
  return fullName || 'Sin nombre registrado'
}

export function userSecondaryName(row: AdminUserRow) {
  const fullName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
  if (row.role === 'client' && row.company_name && fullName) return fullName
  if (row.role === 'worker' && row.profession) return row.profession
  return null
}
