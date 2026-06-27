## Why

El dashboard de TicTrack muestra una grilla "Tareas de Hoy" con cuatro cards hardcoded en el frontend (`TaskGrid.vue` con un array local de tareas). Esto contradice el modelo del proyecto: el backend ya es la fuente de verdad del estado de las tareas desde `add-new-task-view` y `add-timer-persistence`, pero la grilla ignora completamente ese estado y muestra datos ficticios que no responden a mutaciones reales. Este change reemplaza el mock por una grilla conectada al backend vía `GET /tasks`, dejando el frontend como vista pura de la realidad persistida.

## What Changes

- **Nuevo composable `useTaskList`** que envuelve `GET /tasks` con estado reactivo (`tasks`, `loading`, `error`, `refresh`) compartido entre componentes vía `useState`. Expone `refresh()` para invalidación manual después de mutaciones.
- **`TaskGrid.vue` reescrito** para leer de `useTaskList`. Renderiza las tasks del backend con un componente `TaskCard` actualizado que entiende los cuatro status reales (`pending` | `active` | `paused` | `completed`) en vez del enum viejo (`active` | `overtime` | `completed` | `add`).
- **`TaskCard.vue` actualizado** con cuatro ramas de renderizado: `pending` (card normal + chip "Pendiente"), `paused` (card ámbar/tertiary + elapsed congelado), `completed` (card opaca + line-through + "Completada HH:MM"), y la card dashed "+ AÑADIR TAREA RÁPIDA" preservada del diseño Stitch como CTA permanente a `/tasks/new`.
- **Filtro del lado frontend**: la grilla oculta la sesión activa (que ya vive en `ActiveTimerSection` arriba). Muestra solo `pending`, `paused`, y `completed`. Sin polling — la grilla es read-mostly y se refresca explícitamente después de mutaciones.
- **Refresh hooks**: `TaskForm.submit()` y `ActiveTimerSection.complete()` invocan `useTaskList().refresh()` después de mutaciones exitosas para mantener la grilla sincronizada.
- **Reescritura del type `Task` local**: `TaskCard.vue` ya no exporta su propio `Task` interface. Consume el `Task` de `app/types/task.ts` que ya tiene los campos de timer (`status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`, `created_at`, `updated_at`). Elimina el type local redundante.

## Capabilities

### New Capabilities

- `task-list`: Vista de grilla de tareas del dashboard, conectada al backend vía `GET /tasks`. Cubre el composable `useTaskList`, el render adaptativo del `TaskCard` por status, la ocultación de la sesión activa, y la estrategia de refresh on-demand sin polling. La card CTA "+ AÑADIR TAREA RÁPIDA" preserva el patrón Stitch como entrada a `/tasks/new`.

### Modified Capabilities

- `tasks`: Nuevo requirement `GET /tasks lista todas las tareas` documentando el endpoint de lectura. El composable `useApi` ya lo soporta vía el comando Rust `api_request` existente (sin cambios en Rust).

## Impact

- **UI modificada**:
  - `app/components/dashboard/TaskGrid.vue` — reescrito de mock a backend-driven
  - `app/components/dashboard/TaskCard.vue` — cuatro ramas de renderizado (pending/paused/completed/add-placeholder)
- **Frontend nuevo**:
  - `app/composables/useTaskList.ts`
- **Sin cambios en Rust** — el comando `api_request` ya cubre GET.
- **Sin cambios en el mock** — `GET /tasks` ya está implementado en `/home/patricio/json-server/server.js` desde `add-timer-persistence` y retorna el array completo de tasks.
- **Sin cambios en el type `Task`** — `app/types/task.ts` ya tiene todos los campos necesarios.
- **Refresh hooks**: `TaskForm.submit()` y `ActiveTimerSection.complete()` importan y llaman `useTaskList().refresh()` después de éxito. No requiere cambios en esos componentes más allá del import + la llamada (un `await` extra).
- **Validación**: manual con el mock json-server. El usuario crea tareas vía UI, las ve aparecer en el grid, pausa/reanuda/completa desde `ActiveTimerSection`, y verifica que el grid refleja los cambios. Sin tests automatizados — la lógica de transición ya está cubierta por los 28/28 tests de `add-timer-persistence`.
- **Diseño visual**: mantiene la card dashed "+ AÑADIR TAREA RÁPIDA" del Stitch (decisión confirmada viendo "Dashboard Principal - TicTrack (Logo Final)"). Mantiene glass-card, tokens semánticos, sin hex hardcodeados.