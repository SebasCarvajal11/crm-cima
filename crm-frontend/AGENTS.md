# AGENTS.md — crm-frontend

> SPA del CRM CIMA. Lee esto ANTES de generar código.

## Stack

| Capa | Tecnología |
|---|---|
| Core | React 19 + Vite 8 |
| Lenguaje | TypeScript 6 (`strict: true`, `target: ES2023`) |
| Routing | TanStack Router (file-based, typed) |
| Data fetching | TanStack Query (React Query v5) |
| HTTP client | `ky` (fetch wrapper, NO axios) |
| Estado cliente | Zustand (sessionStorage) |
| UI | Tailwind CSS v4 + shadcn/ui + Radix UI + Lucide icons |
| Forms | React Hook Form + Zod resolvers |

## Arquitectura

```
routes/ → components/templates/ → components/organisms/ → components/molecules/ → components/ui/
                                    ↓
                              auth-api.ts / collab-api.ts / bff-api.ts
                                    ↓
                              src/lib/api.ts (ky → KrakenD gateway :8080)
```

**Principio clave:** El frontend NO conoce los microservicios. Todas las llamadas van al gateway. Las URLs usan dominios de experiencia (`/identity/`, `/projects/`, `/admin/`), NO nombres de módulos.

## Estructura de archivos

```
src/
├── main.tsx                          # Entry point, QueryClient, RouterProvider
├── routeTree.gen.ts                  # Auto-generated (NO editar)
├── lib/
│   ├── api.ts                        # ky instance con auto-refresh
│   └── utils.ts                      # cn() utility (clsx + tailwind-merge)
├── auth/
│   ├── session-store.ts              # Zustand: token + email en sessionStorage
│   ├── auth-api.ts                   # 21 funciones HTTP (identity, account, admin)
│   ├── auth.types.ts                 # 14 tipos TypeScript
│   ├── query-keys.ts                 # authKeys + adminUsersKeys factories
│   ├── parse-api-error.ts            # Error parser
│   └── schemas/                      # Zod schemas para formularios
├── collab/
│   ├── collab-api.ts                 # Re-export barrel
│   ├── collab-api.projects.ts        # 12 funciones (projects, brief, files, changes)
│   ├── collab-api.chat.ts            # 4 funciones (internal/external chat)
│   ├── collab-api.tasks.ts           # 7 funciones (tasks, comments, files)
│   ├── collab.types.ts               # 22 tipos (Project, Task, File, etc.)
│   └── query-keys.ts                 # collabKeys factory
├── bff/
│   ├── bff-api.ts                    # fetchDashboardBff()
│   ├── bff.types.ts                  # DashboardBffResponse
│   └── query-keys.ts                 # bffKeys factory
├── routes/                           # 8 rutas TanStack Router
│   ├── __root.tsx                    # Layout raíz
│   ├── index.tsx                     # Landing page
│   ├── login.tsx                     # Login
│   ├── dashboard.tsx                 # Dashboard (4 tabs: overview, collab, account, admin)
│   ├── forgot-password.tsx           # Recuperar contraseña
│   ├── reset-password.tsx            # Resetear contraseña
│   ├── verify-email.tsx              # Verificar email
│   └── accept-invite.$token.tsx      # Aceptar invitación
└── components/
    ├── ui/                           # 18 shadcn/ui primitives (átomos)
    ├── molecules/                    # 6 componentes compuestos
    ├── organisms/                    # 25 componentes de feature
    │   ├── account/                  # 3 (identity, password, sessions)
    │   ├── admin/                    # 3 (invite, user-table, user-actions)
    │   └── collab/                   # 14 (project-card, task-board, chat, files, etc.)
    └── templates/                    # 2 (app-shell, auth-card-layout)
```

## HTTP Client (`src/lib/api.ts`)

- **Librería:** `ky` con `prefix: getApiBaseUrl()` (default `/api`)
- **Credentials:** `include` (cookie httpOnly para refresh)
- **Timeout:** 30s
- **Retry:** deshabilitado en ky (lógica manual)
- **Auto-refresh hook:** En 401 → intenta `POST /auth/refresh` con cookie → reintenta request original
- **Deduplicación:** `refreshInFlight` previene refresh concurrentes

## Convenciones de código

### Organización por dominio
Cada dominio (`auth/`, `collab/`, `bff/`) tiene sus propios:
- `*-api.ts` — funciones HTTP
- `*.types.ts` — tipos TypeScript
- `query-keys.ts` — TanStack Query key factories

### Query keys
```typescript
authKeys.all          = ['auth']
authKeys.me()         = ['auth', 'me']
collabKeys.all        = ['collab']
collabKeys.projects() = ['collab', 'projects']
bffKeys.dashboard()   = ['bff', 'dashboard']
```

### Patrón de componente
```tsx
// 1. Query con initialData si viene del BFF
const projectsQ = useQuery({
  queryKey: collabKeys.projects(),
  queryFn: () => listProjectsRequest(accessToken, { page: 1, limit: 100 }),
  initialData: initialProjects ? { data: initialProjects } : undefined,
})

// 2. Estados de carga/error explícitos
if (projectsQ.isLoading) return <Skeleton />
if (projectsQ.isError) return <Alert variant="destructive">...</Alert>

// 3. Render
return <div>{projectsQ.data?.data.map(...)}</div>
```

### Patrón de formulario
```tsx
const form = useForm<LoginRequest>({
  resolver: zodResolver(loginRequestSchema),
  defaultValues: { email: '', password: '' },
})
```

### Patrón de mutación con invalidación
```tsx
const mutation = useMutation({
  mutationFn: (body) => createProjectRequest(accessToken, body),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: collabKeys.projects() })
  },
})
```

## Reglas absolutas

### HACER SIEMPRE
- Usar el cliente `api` de `src/lib/api.ts` para TODAS las llamadas HTTP
- Definir tipos de respuesta en `*.types.ts` alineados con el gateway
- Manejar estados de loading y error explícitamente en queries/mutaciones
- Usar `queryKeys` factories para cache management
- Invalidar queries después de mutaciones exitosas
- Usar `bearer(accessToken)` helper para headers de auth

### NUNCA HACER
- Usar `fetch` o `axios` directamente — siempre `ky` via `api`
- Hardcodear puertos internos (`:3000`, `:3001`) — solo el gateway
- Hacer llamadas API en route loaders — usar `useQuery` en componentes
- Usar `any` — siempre tipos explícitos
- Poner strings de endpoints en componentes — encapsular en `*-api.ts`
- Referenciar `/auth/` o `/collab/` en componentes — las funciones API ya usan las URLs correctas

## Gateway URLs (topología oculta)

| Dominio URL | Propósito | Ejemplos |
|---|---|---|
| `/auth/*` | Auth público | login, refresh, forgot-password, accept-invite |
| `/identity/*` | Identidad autenticada | me, logout, search |
| `/account/*` | Gestión de cuenta | password, sessions, verify-email |
| `/admin/*` | Administración | users, workers, clients/invite |
| `/projects/*` | Proyectos y Kanban | projects, tasks, columns, files, chat |
| `/tasks/*` | Tareas directas | tasks/{id} |
| `/files/*` | Archivos directos | files/{id}/download, files/{id}/approve |
| `/bff/*` | Agregación | dashboard, workspace/{id} |

## Atomic Design

| Nivel | Directorio | Ejemplos |
|---|---|---|
| Átomos | `ui/` | Button, Input, Badge, Card, Skeleton |
| Moléculas | `molecules/` | FormField, PriorityBadge, SectionIntro, UserChip |
| Organismos | `organisms/` | LoginForm, CollabPanel, ProjectWorkspace, TaskBoard |
| Templates | `templates/` | AppShell (sidebar+header), AuthCardLayout |

## Verificación

```bash
npx tsc --noEmit    # TypeScript check
npm run dev          # Dev server (puerto 5173)
```
