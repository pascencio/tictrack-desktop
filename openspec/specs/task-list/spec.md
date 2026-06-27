# task-list Specification

## Purpose
TBD - created by archiving change add-task-list-view. Update Purpose after archive.
## Requirements
### Requirement: Listar tareas vía GET /tasks

El frontend SHALL invocar `GET {TICTRACK_BACKEND_URL}/tasks` desde el composable `useTaskList` para obtener todas las tasks persistidas. El proceso Rust SHALL proxy la llamada vía el comando `api_request` existente (sin nuevos comandos Tauri).

El backend SHALL responder `200 OK` con un array JSON de `Task[]` (todas las tasks, independientemente de su `status`). Si no hay tasks, SHALL responder `200 OK` con `[]`.

El frontend SHALL re-invocar el endpoint explícitamente vía `useTaskList.refresh()` después de cada mutación que pueda afectar la grilla:

- `POST /tasks` exitoso (creación).
- `PATCH /tasks/:id` con `completed_at` exitoso (la activa pasa a `completed` y aparece en el grid si estaba oculta).

El frontend SHALL NO usar polling para este endpoint.

#### Scenario: Lista inicial con tareas

- **WHEN** el usuario navega a `/` y existen tasks persistidas en el backend
- **THEN** el frontend SHALL invocar `GET /tasks` en mount
- **THEN** SHALL renderizar una card por cada task retornada (excepto la activa, ver "Filtrar activa del grid")

#### Scenario: Backend vacío

- **WHEN** `GET /tasks` retorna `[]`
- **THEN** SHALL mostrar un empty state con CTA grande a `/tasks/new`
- **THEN** SHALL NO mostrar la card placeholder "+ AÑADIR TAREA RÁPIDA" en el grid (el empty state la reemplaza)

#### Scenario: Refresh después de crear task

- **WHEN** el usuario crea una task vía `/tasks/new` y el `POST /tasks` retorna 2xx
- **THEN** el frontend SHALL invocar `useTaskList.refresh()` antes de cerrar el modal de éxito o después
- **THEN** el grid SHALL incluir la nueva task en su próximo render

#### Scenario: Refresh después de completar la activa

- **WHEN** el usuario hace click en "Completar" en `ActiveTimerSection` y el `PATCH /tasks/:id` retorna 2xx
- **THEN** el frontend SHALL invocar `useTaskList.refresh()`
- **THEN** el grid SHALL incluir la task recién completada en su próximo render con estilo completado

### Requirement: Filtrar activa del grid

El frontend SHALL excluir del render cualquier task con `status='active'`. La activa ya está visible arriba en `ActiveTimerSection` con timer real, botones de pause/complete y barra de progreso con budget.

Si la sesión activa cambia (pausa, completa, auto-complete desde `POST /tasks`), el grid SHALL actualizarse implícitamente la próxima vez que se refresque (vía los hooks definidos en "Listar tareas vía GET /tasks").

#### Scenario: Activa presente en el array del backend

- **WHEN** `GET /tasks` retorna un array que incluye una task con `status='active'`
- **THEN** SHALL renderizar todas las tasks excepto la activa
- **THEN** SHALL NO renderizar ninguna card para la activa

#### Scenario: Solo la activa existe

- **WHEN** `GET /tasks` retorna solo la task activa
- **THEN** el grid SHALL mostrar el empty state con CTA grande a `/tasks/new`
- **THEN** SHALL NO mostrar la card placeholder (el empty state la reemplaza)

### Requirement: TaskCard renderiza por status

El componente `TaskCard.vue` SHALL consumir el type `Task` global de `app/types/task.ts` y SHALL renderizar cinco ramas según el input:

- `status='pending'`: card glass-card normal, chip "Pendiente" en primary, progress bar al 0%, title en `text-foreground`, tags como chips de `secondary-container`, ID de task visible.
- `status='paused'`: card con `bg-tertiary-container/10` y border `tertiary/30`, chip "Pausada" en `tertiary`, elapsed congelado al momento de pausar, progress bar al % actual.
- `status='completed'`: card con `opacity-60`, border dashed `outline-variant/30`, title con `line-through`, label "Completada HH:MM" formateado desde `completed_at`, sin progress bar interactivo.
- `status='active'`: NUNCA se renderiza (el grid la filtra). Solo presente en `ActiveTimerSection`.
- placeholder (slot del grid, no es un `Task`): card dashed border con icono `Plus`, label "AÑADIR TAREA RÁPIDA" en uppercase tracking-widest, hover scale.

#### Scenario: Render pending

- **WHEN** se pasa una task con `status='pending'`, `title='X'`, `budget_minutes=90`, `tags=['a']`
- **THEN** SHALL mostrar el chip "Pendiente" en `primary`
- **THEN** SHALL mostrar el progress bar al 0%
- **THEN** SHALL mostrar el título sin line-through

#### Scenario: Render paused

- **WHEN** se pasa una task con `status='paused'`, `paused_at='2026-06-22T20:00:00Z'`, `accumulated_paused_ms=30000`
- **THEN** SHALL mostrar el chip "Pausada" en `tertiary`
- **THEN** SHALL mostrar el elapsed congelado en `30s`
- **THEN** SHALL mostrar la card con tinte ámbar (`bg-tertiary-container/10`)

#### Scenario: Render completed

- **WHEN** se pasa una task con `status='completed'`, `completed_at='2026-06-22T21:00:00Z'`, `accumulated_paused_ms=1800000`
- **THEN** SHALL mostrar el título con `line-through`
- **THEN** SHALL mostrar "Completada 21:00" formateado desde `completed_at`
- **THEN** SHALL aplicar `opacity-60`

#### Scenario: Placeholder en el grid

- **WHEN** el grid renderiza la card placeholder (no es una Task, es un slot fijo)
- **THEN** SHALL mostrar border dashed `outline-variant/30`
- **THEN** SHALL mostrar el icono `Plus` en `outline-variant`
- **THEN** SHALL mostrar "AÑADIR TAREA RÁPIDA" en uppercase tracking-widest
- **THEN** SHALL navegar a `/tasks/new` cuando el usuario hace click

### Requirement: TaskGrid usa useTaskList

El componente `TaskGrid.vue` SHALL:

- Importar `useTaskList` y leer `tasks`, `loading`, `error`, `refresh`.
- Llamar `refresh()` en `onMounted` para hidratar el estado inicial.
- Renderizar las tasks retornadas en el orden que llegan del backend (sin reordenamiento).
- Renderizar la card placeholder "+ AÑADIR TAREA RÁPIDA" como última card del grid SOLO cuando hay al menos una task (no en empty state).
- Renderizar un empty state con CTA grande a `/tasks/new` SOLO cuando `tasks.length === 0` Y no hay activa.
- Mostrar el contador "N Pendientes" en el header, donde N = tasks con `status='pending'`.
- Mostrar el botón "Ver histórico" en el header (link placeholder, futuro change).

#### Scenario: Render inicial

- **WHEN** el componente monta y `refresh()` resuelve con un array de N tasks
- **THEN** SHALL renderizar N `TaskCard` más la card placeholder al final (si N > 0)
- **THEN** SHALL mostrar "N Pendientes" en el header

#### Scenario: Empty state sin tasks

- **WHEN** `tasks.length === 0` Y `useActiveSession().session === null`
- **THEN** SHALL NO renderizar el grid de cards
- **THEN** SHALL mostrar empty state con CTA "Crear tu primera tarea" que navega a `/tasks/new`

#### Scenario: Empty state con activa (oculta del grid)

- **WHEN** `tasks.length === 0` Y hay activa en `useActiveSession().session`
- **THEN** SHALL mostrar el mismo empty state que sin activa (consistente para el usuario)

#### Scenario: Loading state

- **WHEN** `loading === true` y `tasks.length === 0` (initial fetch en curso)
- **THEN** SHALL mostrar skeleton cards o copy "Cargando..."

### Requirement: Eliminar Task interface local de TaskCard.vue

El componente `TaskCard.vue` SHALL NO exportar su propio `Task` interface ni su propio `TaskStatus` union type. SHALL importar el type `Task` global desde `~/types/task` y SHALL usar el `TaskStatus` del mismo módulo.

#### Scenario: Imports del componente

- **WHEN** se lee `app/components/dashboard/TaskCard.vue`
- **THEN** SHALL contener `import type { Task, TaskStatus } from '~/types/task'`
- **THEN** SHALL NO contener `export interface Task`
- **THEN** SHALL NO contener `export type TaskStatus`

