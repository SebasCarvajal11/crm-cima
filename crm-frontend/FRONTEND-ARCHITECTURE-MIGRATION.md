# Frontend Architecture Migration Plan

## 1) Objetivo

Migrar el frontend hacia una arquitectura hibrida:

- Atomic Design para UI reusable (`shared/ui`).
- Modulos por dominio para negocio (`features/*`).
- Reglas de dependencias explicitas para evitar acoplamiento y duplicacion.

La migracion debe ser incremental, sin congelar desarrollo ni romper funcionalidades existentes.

## 2) Diagnostico resumido

Situacion actual observada:

- Ya existe estructura Atomic parcial en `src/components/{ui,molecules,organisms,templates}`.
- Ya existen modulos de dominio en `src/{auth,collab,media,bff}`.
- El problema principal es mezcla de responsabilidades en componentes grandes:
  - UI + estado local + queries/mutations + navegacion + reglas de negocio en un mismo archivo.
- Hay duplicacion de patrones transversales:
  - Parseo de errores.
  - Invalidaciones de cache.
  - Estrategias de formularios/mutaciones.

## 3) Arquitectura objetivo

```text
src/
  app/
    providers/
    router/
    layouts/
  shared/
    ui/               # atomos y primitivas de diseño (Atomic)
    lib/              # utilidades puras y helpers transversales
    hooks/            # hooks genericos sin conocimiento de dominio
    types/            # tipos globales muy estables
    config/           # config tipada del frontend
  features/
    auth/
      api/
      model/          # tipos, schemas, query-keys del dominio
      hooks/          # casos de uso del dominio (query/mutation)
      ui/             # moleculas/organismos de auth (feature-local)
      utils/
    collab/
      api/
      model/
      hooks/
      ui/
      utils/
    media/
      api/
      model/
      hooks/
      ui/
      utils/
    admin/
      api/
      model/
      hooks/
      ui/
      utils/
  pages/              # composicion por ruta (thin pages)
  routes/             # definicion de rutas TanStack
```

## 4) Reglas de dependencia (contrato)

Regla base: dependencias solo hacia adentro de capas mas estables.

Permitido:

1. `routes -> pages`
2. `pages -> features/*/ui + app/layouts + shared/*`
3. `features/*/ui -> features/*/hooks + shared/ui + shared/lib`
4. `features/*/hooks -> features/*/api + features/*/model + shared/lib`
5. `features/*/api -> shared/lib`
6. `shared/*` no depende de `features/*`

No permitido:

1. `shared/* -> features/*`
2. `features/auth -> features/collab` (acoplamiento directo entre features)
3. `ui components` con llamadas HTTP directas
4. `pages` con reglas de negocio densas

Notas:

- Si una feature necesita datos de otra, usar contratos via `shared/types` o BFF.
- Atomic deja de ser carpeta global de "todo"; solo `shared/ui` es verdaderamente global.

## 5) Convenciones de implementacion

1. Cada feature expone un facade por `index.ts` (surface controlado).
2. Casos de uso se expresan como hooks (`useXxxQuery`, `useXxxMutation`).
3. Componentes UI no deben conocer `ky`, endpoints ni parsing de HTTP.
4. Query keys se mantienen en `features/<x>/model/query-keys.ts`.
5. Errores de API pasan por una capa comun (`shared/lib/api-error.ts`).

## 6) Plan por etapas

## Etapa 0 - Gobernanza (sin cambios funcionales)

Objetivo:

- Definir contrato de capas y naming.

Entregables:

1. Documento de arquitectura (este archivo).
2. Checklist de PR para validar reglas.
3. Mapa de modulos inicial con ownership.

## Etapa 1 - Skeleton de arquitectura (sin romper imports actuales)

Objetivo:

- Crear estructura destino en paralelo.

Entregables:

1. Crear `src/app`, `src/shared`, `src/features`, `src/pages`.
2. Mover `src/lib/api.ts` -> `src/shared/lib/api-client.ts` (con adaptador de compatibilidad temporal).
3. Crear facades `index.ts` por feature sin mover todo de una vez.

Riesgo:

- Bajo, si se mantiene compatibilidad de rutas de import.

## Etapa 2 - Extraer logica de datos (strangler pattern)

Objetivo:

- Sacar `useQuery/useMutation` de organismos grandes.

Entregables:

1. Hooks de dominio por feature.
2. Components convertidos a presentacionales/controlados.
3. Invalidaciones centralizadas en hooks.

Riesgo:

- Medio. Cambios de estado/caching pueden introducir regresiones.

## Etapa 3 - Normalizar transversales

Objetivo:

- Eliminar duplicacion sistematica.

Entregables:

1. `shared/lib/api-error.ts`.
2. Helpers de mutation/query comunes.
3. Patrones unificados de formulario por feature.

Riesgo:

- Medio-bajo.

## Etapa 4 - Consolidacion y limpieza

Objetivo:

- Cerrar deuda tecnica y borrar estructuras legacy.

Entregables:

1. Eliminar imports legacy.
2. Remover carpetas antiguas cuando no tengan referencias.
3. Endurecer lint para bloquear nuevas violaciones de capas.

## 7) Primer lote concreto (Fase 1: Collab)

Prioridad: `collab` porque concentra mayor complejidad y componentes mas grandes.

### 7.1 Archivos iniciales a intervenir

1. `src/components/organisms/collab/project-workspace.tsx`
2. `src/components/organisms/collab/chat-panel.tsx`
3. `src/components/organisms/collab/task-sheet.tsx`
4. `src/components/organisms/collab/task-files-tab.tsx`
5. `src/components/organisms/collab/create-task-modal.tsx`

### 7.2 Hooks a crear en la nueva estructura

1. `src/features/collab/hooks/use-project-workspace-data.ts`
2. `src/features/collab/hooks/use-project-board-mutations.ts`
3. `src/features/collab/hooks/use-project-chat.ts`
4. `src/features/collab/hooks/use-task-files.ts`
5. `src/features/collab/hooks/use-task-comments.ts`

### 7.3 Criterios de aceptacion para esta fase

1. Ningun componente de `features/collab/ui` ejecuta llamadas HTTP directas.
2. `project-workspace` baja de tamano y queda como orquestador de UI.
3. Invalidaciones de `collabKeys` concentradas en hooks de dominio.
4. Mismo comportamiento funcional observable en dashboard/collab.
5. Build y typecheck limpios con `pnpm`.

## 8) Guardrails de calidad por PR

Checklist minimo:

1. SRP: cada archivo tiene una responsabilidad clara.
2. OCP: nuevas variaciones se agregan por composicion, no por `if` masivo.
3. DRY: no repetir misma invalidacion/error mapping en multiples archivos.
4. Sin dependencia cruzada entre features.
5. Sin imports nuevos desde legacy hacia capas nuevas que violen contrato.

## 9) Metricas de avance

1. Reduccion de lineas promedio en `organisms` legacy.
2. Numero de hooks de dominio creados y usados.
3. Cantidad de imports legacy remanentes.
4. Numero de componentes presentacionales vs componentes con data logic.
5. Defectos/regresiones por fase.

## 10) Orden sugerido desde ahora

1. Crear skeleton (`src/features`, `src/shared`, `src/pages`) y adaptadores.
2. Migrar vertical de `collab` (workspace -> chat -> tasks -> files).
3. Migrar `account/admin`.
4. Migrar `auth` de UI.
5. Limpieza final de legacy.

## 11) Excepciones controladas vigentes

1. `routes/*` puede importar `components/templates/*` para layout de pagina (ej. `AuthCardLayout`, `AppShell`).
2. `routes/*` no debe importar `components/organisms/*`; debe consumir `features/*/ui`.
3. `components/templates/*` no debe importar `features/*`; recibe UI y acciones por composicion/props.
4. Si una excepcion nueva es necesaria, debe documentarse aqui y acompañarse de regla ESLint acotada.

## 12) Estado final y DoD

Estado actual:

1. Arquitectura activa consolidada en `app`, `pages`, `features` y `shared`.
2. Dependencias por capas validadas con reglas ESLint por feature, routes y templates.
3. Legacy estructural retirado y reemplazado por entrypoints de feature.

Definition of Done (DoD) para cambios nuevos:

1. `routes/*` solo delega a `pages/*`.
2. `pages/*` compone `features/*/ui` y templates, sin llamadas HTTP directas.
3. `features/*/ui` no contiene acceso HTTP ni parseo de errores.
4. `features/*/hooks` concentra casos de uso y side-effects.
5. `features/*/api` depende solo de `shared/lib`.
6. Contratos compartidos van en `shared/types` y no en features cruzadas.
7. `components/templates/*` no depende de `features/*`.
8. PR no introduce imports que violen las reglas de boundary.
9. `pnpm exec eslint src` y `pnpm exec tsc --noEmit` deben quedar en verde.
