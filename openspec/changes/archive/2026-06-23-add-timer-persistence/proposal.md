## Why

El change anterior (`add-new-task-view`) dejó el modelo `Task` y el contrato `POST /tasks` listos para soportar persistencia de timer, pero la UI del timer (`ActiveTimerSection.vue`) sigue siendo un mock local con `setInterval` que pierde el conteo al cerrar la app. Para que el usuario confíe en el time tracking, el timer debe sobrevivir cierres de la app — y el modelo de "as if not paused" requiere que el estado viva en el backend y se calcule reactivamente desde `started_at` + `accumulated_paused_ms`. Este change implementa esa persistencia, conecta el frontend al estado real, y respeta la regla de single timer (un solo activo a la vez, auto-completa el anterior).

## What Changes

- **Nuevo endpoint `GET /sessions/active`** que devuelve la tarea con `status='active'` o `'paused'` (la sesión actualmente en curso), o `204 No Content` si no hay ninguna.
- **`POST /tasks` extendido**: cuando `start_immediately=true` y ya existe una sesión activa, el backend SHALL auto-completarla (registrar `completed_at` con la duración acumulada) antes de crear la nueva. Esto respeta el contrato de single timer sin requerir UX extra de confirmación.
- **Nuevo endpoint `PATCH /tasks/:id`** que acepta un body con uno de: `{ paused_at }`, `{ resumed_at }`, `{ completed_at }`. El backend computa la transición de estado y actualiza `status`, `paused_at`, `accumulated_paused_ms`, `completed_at` atómicamente.
- **Nuevo composable `useActiveSession`** que envuelve `GET /sessions/active` con estado reactivo y re-fetch cada 60s mientras la página está abierta (suficiente para mantener `elapsed` actualizado sin polling agresivo).
- **`ActiveTimerSection.vue` reescrito** para leer de `useActiveSession` en lugar de `setInterval` local. Calcula `elapsed = now − started_at − accumulated_paused_ms` reactivamente, muestra el título real de la tarea activa, y conecta los botones Pausa / Completar a `PATCH /tasks/:id`.
- **Nuevo botón "Reanudar"** en `ActiveTimerSection.vue` cuando `status='paused'`, que llama `PATCH /tasks/:id` con `resumed_at` y muestra `accumulated_paused_ms` adicional al volver a active.
- **`TaskForm.vue` ajustado** para mostrar un aviso "Ya tenés una sesión activa: <título>" sobre el form de `/tasks/new` cuando hay una sesión activa, con un botón "Detenerla y empezar esta" que la completa primero y luego dispara el submit.
- **Sin nuevos componentes shadcn** — los botones y slider existentes alcanzan.

## Capabilities

### New Capabilities

- `timer-sessions`: Persistencia del timer activo en el backend. Cubre la consulta de la sesión activa (`GET /sessions/active`), las transiciones de estado vía PATCH sobre la task activa, el composable `useActiveSession`, la UI reactiva del timer en `ActiveTimerSection.vue` (incluyendo botones Pausa/Reanudar/Completar), y la semántica de single timer enforced server-side.

### Modified Capabilities

- `tasks`: 
  - `POST /tasks` ahora auto-completa la sesión activa previa cuando `start_immediately=true` (single timer enforced).
  - Nuevo endpoint `PATCH /tasks/:id` para transiciones de estado de timer (`paused_at`, `resumed_at`, `completed_at`).

## Impact

- **UI modificada**:
  - `app/components/dashboard/ActiveTimerSection.vue` — reescrito de mock a real
  - `app/components/tasks/TaskForm.vue` — banner de sesión activa pre-existente
- **Frontend nuevo**:
  - `app/composables/useActiveSession.ts`
- **Rust sin cambios estructurales** — el comando `api_request` ya cubre `GET /sessions/active` y `PATCH /tasks/:id`. Solo se documenta el contrato en la spec.
- **Backend (mock json-server)**:
  - Custom middleware para `GET /sessions/active` (filtra tasks por status)
  - Custom middleware para `PATCH /tasks/:id` que computa `accumulated_paused_ms` y transición de estado
  - Custom middleware para `POST /tasks` que auto-completa sesión activa previa
- **Variables de ambiente / bundle**: sin cambios — sigue usando `TICTRACK_BACKEND_URL`.
- **Validación**: manual con el mock json-server (single source of truth = backend, fácil de verificar con `curl` y la UI).
- **Diseño visual**: `ActiveTimerSection.vue` mantiene el patrón glass-card con timer display (`.font-display-timer .timer-glow`), botones con variantes shadcn (`default`/`outline`), anillo SVG de progreso ya implementado. No se introducen colores hex nuevos ni tokens custom.
- **Forward-compat con `add-new-task-view`**: este change CONSUME el modelo `Task` que ya tiene `status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`. Sin renegociación de contrato.