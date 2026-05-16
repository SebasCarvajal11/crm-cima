import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchClientsRequest } from '@/features/auth/api'
import type { ClientSearchResult } from '@/shared/types'
import type { UserRole } from '@/shared/types'

type Props = {
  accessToken: string
  role: UserRole
  selected: ClientSearchResult[]
  onSelect: (user: ClientSearchResult) => void
  placeholder?: string
  queryKeyPrefix?: string
}

/**
 * Molecula: campo de busqueda con debounce para usuarios por email.
 * Emite la seleccion via onSelect sin gestionar el estado de seleccionados.
 */
export function UserSearch({ accessToken, role, selected, onSelect, placeholder, queryKeyPrefix = 'user-search' }: Props) {
  const [query,      setQuery]      = useState('')
  const [show,       setShow]       = useState(false)
  const [debounced,  setDebounced]  = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebounced(query.length < 2 ? '' : query)
    }, 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const searchQ = useQuery({
    queryKey: [queryKeyPrefix, role, debounced],
    queryFn:  () => searchClientsRequest(accessToken, debounced, role),
    enabled:  debounced.length >= 2,
    staleTime: 30_000,
  })

  const suggestions = (searchQ.data?.data ?? []).filter(
    (u) => !selected.some((s) => s.subject === u.subject)
  )

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
      <Input
        className="pl-9"
        placeholder={placeholder ?? 'Busca por email…'}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)}
        autoComplete="off"
      />
      {show && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
          {searchQ.isFetching ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              <div className="size-3 rounded-full border border-muted-foreground border-t-transparent animate-spin" />
              Buscando…
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              {debounced.length >= 2 ? 'Sin resultados.' : 'Escribe al menos 2 caracteres.'}
            </p>
          ) : (
            suggestions.map((u) => (
              <button
                key={u.subject}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left transition-colors"
                onClick={() => { onSelect(u); setQuery(''); setShow(false) }}
              >
                <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate flex-1">{u.email}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{u.role}</Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}


