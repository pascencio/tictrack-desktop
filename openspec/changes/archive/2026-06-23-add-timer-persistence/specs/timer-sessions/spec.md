## Purpose

Persistir el estado del timer activo en el backend para que el conteo sobreviva cierres de la app (single timer, source of truth en backend, "as if not paused" al reabrir). Cubre la consulta de sesión activa, las transiciones de estado del timer (pausar/reanudar/completar), la UI reactiva del timer en el dashboard, y la semántica de single timer enforced server-side.

## ADDED Requirements

### Requirement: Consultar sesión activa vía GET /sessions/active

El frontend SHALL invocar `GET {TICTRACK_BACKEND_URL}/sessions/active` desde el composable `useActiveSession` para obtener la tarea actualmente en curso. El proceso Rust SHALL proxy la llamada vía el comando `api_request` existente (sin nuevos comandos Tauri).

El backend SHALL responder:

- `200 OK` con body JSON de la `Task` cuyo `status` es `'active'` o `'paused'`. Si hay más de una, SHALL devolver la más reciente (mayor `started_at`).
- `204 No Content` (sin body) si no existe ninguna tarea con status distinto a `'pending'` o `'completed'`.

El composable SHALL re-invocar el endpoint cada 60 segundos mientras la página está abierta, para corregir drift si el reloj del sistema cambia.

#### Scenario: Hay una sesión activa al iniciar la app

- **WHEN** el usuario abre la app y existe una tarea con `status='active'` o `'paused'` en el backend
- **THEN** el composable SHALL exponer la sesión recibida con todos sus campos (`started_at`, `paused_at`, `accumulated_paused_ms`, etc.)
- **THEN** el frontend SHALL calcular `elapsed = now − started_at − accumulated_paused_ms` reactivamente

#### Scenario: No hay sesión activa al iniciar la app

- **WHEN** el usuario abre la app y no existe ninguna tarea con `status='active'` o `'paused'`
- **THEN** el composable SHALL exponer `null` como sesión activa
- **THEN** el frontend SHALL mostrar el estado vacío en `ActiveTimerSection`

#### Scenario: Re-fetch corrige drift

- **WHEN** han transcurrido 60 segundos desde el último fetch y la página sigue abierta
- **THEN** el composable SHALL re-invocar `GET /sessions/active`
- **THEN** SHALL actualizar la sesión activa con la respuesta del backend (corrige drift de tiempo)

### Requirement: Transiciones de estado vía PATCH /tasks/:id

El frontend SHALL enviar `PATCH {TICTRACK_BACKEND_URL}/tasks/{id}` con un body que contenga exactamente uno de los siguientes campos para indicar la transición:

- `{ "paused_at": "2026-06-22T20:00:00Z" }` — pausar una tarea activa.
- `{ "resumed_at": "2026-06-22T20:30:00Z" }` — reanudar una tarea pausada.
- `{ "completed_at": "2026-06-22T21:00:00Z" }` — completar (terminal).

El backend SHALL:

- Validar que la transición es legal según el state machine (`active → paused`, `paused → active`, `active|paused → completed`).
- Computar el nuevo `status`, `accumulated_paused_ms`, `paused_at`, `completed_at` atómicamente.
- Retornar `200 OK` con la Task actualizada en JSON.
- Retornar `409 Conflict` con body `{"error": "invalid_transition", "from": "<current_status>", "to": "<requested>"}` si la transición no es válida.
- Retornar `404 Not Found` si la task no existe.

Reglas de cómputo al reanudar:

- `new_accumulated_paused_ms = old_accumulated_paused_ms + (resumed_at − paused_at)`
- `new_paused_at = null`
- `new_status = 'active'`

Reglas al completar desde paused (sin resume previo):

- `final_accumulated_paused_ms = old_accumulated_paused_ms + (completed_at − paused_at)`
- `new_paused_at = null`
- `new_status = 'completed'`

Reglas al completar desde active:

- `final_accumulated_paused_ms = old_accumulated_paused_ms` (sin cambios)
- `new_status = 'completed'`

#### Scenario: Pausar sesión activa

- **WHEN** la sesión activa tiene `status='active'` y el frontend envía `PATCH /tasks/{id}` con `{"paused_at": "<now>"}`
- **THEN** el backend SHALL actualizar `status='paused'` y `paused_at=<now>`
- **THEN** SHALL retornar `200 OK` con la Task actualizada
- **THEN** el frontend SHALL refrescar `useActiveSession` con la respuesta

#### Scenario: Reanudar sesión pausada

- **WHEN** la sesión activa tiene `status='paused'` y `paused_at=T1` y el frontend envía `PATCH /tasks/{id}` con `{"resumed_at": "T2"}`
- **THEN** el backend SHALL actualizar `status='active'`, `paused_at=null`, `accumulated_paused_ms += (T2 − T1)`
- **THEN** SHALL retornar `200 OK` con la Task actualizada

#### Scenario: Completar sesión activa

- **WHEN** la sesión activa tiene `status='active'` y el frontend envía `PATCH /tasks/{id}` con `{"completed_at": "<now>"}`
- **THEN** el backend SHALL actualizar `status='completed'`, `completed_at=<now>`, sin modificar `accumulated_paused_ms`
- **THEN** SHALL retornar `200 OK` con la Task actualizada

#### Scenario: Completar sesión pausada

- **WHEN** la sesión activa tiene `status='paused'` con `paused_at=T1` y el frontend envía `PATCH /tasks/{id}` con `{"completed_at": "T2"}`
- **THEN** el backend SHALL sumar `(T2 − T1)` a `accumulated_paused_ms`, limpiar `paused_at`, actualizar `status='completed'` y `completed_at=T2`

#### Scenario: Transición inválida (pausar dos veces)

- **WHEN** la sesión activa tiene `status='paused'` y el frontend envía `PATCH /tasks/{id}` con `{"paused_at": "<now>"}`
- **THEN** el backend SHALL retornar `409 Conflict` con `{"error": "invalid_transition", "from": "paused", "to": "paused"}`
- **THEN** el frontend SHALL mostrar el error inline y NO actualizar `useActiveSession`

### Requirement: ActiveTimerSection refleja la sesión activa

El componente `ActiveTimerSection.vue` SHALL leer de `useActiveSession` y mostrar:

- Si hay sesión activa con `status='active'`: el `title` real de la task, el timer display con `elapsed = now − started_at − accumulated_paused_ms` (actualizado cada segundo localmente sin requests), y botones **Pausa** + **Completar**.
- Si hay sesión activa con `status='paused'`: el `title` real, el timer display congelado en `elapsed` al momento de pausar, y botones **Reanudar** + **Completar**. Un indicador visual SHALL marcar el estado paused (color `tertiary`).
- Si no hay sesión activa: estado vacío con copy motivacional y un CTA **Iniciar una tarea** que navega a `/tasks/new`.

El timer display SHALL usar `.font-display-timer .timer-glow` cuando está activo (consistente con la skill `design-system`).

#### Scenario: Sesión activa al cargar el dashboard

- **WHEN** el usuario navega a `/` y `useActiveSession` retorna una task con `status='active'`
- **THEN** SHALL mostrar el título de la task
- **THEN** SHALL mostrar el elapsed time calculado y actualizándose cada segundo
- **THEN** SHALL mostrar botones Pausa y Completar

#### Scenario: Sesión pausada al cargar el dashboard

- **WHEN** `useActiveSession` retorna una task con `status='paused'`
- **THEN** SHALL mostrar el título y el elapsed congelado al momento de pausar
- **THEN** SHALL mostrar el indicador visual de estado paused
- **THEN** SHALL mostrar botones Reanudar y Completar

#### Scenario: Sin sesión activa

- **WHEN** `useActiveSession` retorna `null`
- **THEN** SHALL mostrar estado vacío con CTA a `/tasks/new`

#### Scenario: Click Pausa

- **WHEN** el usuario hace click en **Pausa** con sesión activa en `status='active'`
- **THEN** SHALL llamar `PATCH /tasks/{id}` con `{"paused_at": "<now>"}`
- **THEN** SHALL actualizar `useActiveSession` con la respuesta

#### Scenario: Click Reanudar

- **WHEN** el usuario hace click en **Reanudar** con sesión pausada
- **THEN** SHALL llamar `PATCH /tasks/{id}` con `{"resumed_at": "<now>"}`
- **THEN** SHALL actualizar `useActiveSession` con la respuesta

#### Scenario: Click Completar

- **WHEN** el usuario hace click en **Completar**
- **THEN** SHALL llamar `PATCH /tasks/{id}` con `{"completed_at": "<now>"}`
- **THEN** SHALL limpiar la sesión activa en `useActiveSession` (refetch devuelve null)
- **THEN** SHALL mostrar el estado vacío

### Requirement: App cerrada durante sesión activa retoma el tiempo

Cuando el proceso de la app se cierra mientras hay una sesión activa en el backend y se reabre la app, el sistema SHALL:

- El frontend SHALL invocar `GET /sessions/active` en mount.
- El backend SHALL retornar la misma task con su `started_at` y `accumulated_paused_ms` originales.
- El frontend SHALL calcular `elapsed = now − started_at − accumulated_paused_ms`, que SHALL incluir el tiempo que la app estuvo cerrada (modelo "as if not paused").

#### Scenario: Sesión activa sobrevive cierre de app

- **WHEN** el usuario cierra la app en `T0` con sesión activa iniciada en `T_start` (`started_at = T_start`, `accumulated_paused_ms = 0`)
- **AND** el usuario reabre la app en `T1 = T0 + 3600s`
- **THEN** `ActiveTimerSection` SHALL mostrar `elapsed = 3600s` (no `0`)

#### Scenario: Sesión pausada sobrevive cierre de app

- **WHEN** el usuario cierra la app en `T0` con sesión pausada (`paused_at = T_pause`, `accumulated_paused_ms = X`)
- **AND** el usuario reabre la app en `T1`
- **THEN** `ActiveTimerSection` SHALL mostrar `elapsed` congelado en el valor al momento de pausar (no incrementa durante `T1 − T0`)
- **THEN** SHALL mostrar el indicador visual de paused

### Requirement: Aviso de sesión activa en /tasks/new

Cuando el usuario navega a `/tasks/new` y `useActiveSession` retorna una sesión activa (status='active' o 'paused'), el form SHALL mostrar arriba:

- Banner ámbar (`tertiary`) con texto: "Ya tenés una sesión activa: \<título\>".
- Botón **Detenerla y empezar esta** que primero llama `PATCH /tasks/{id}` con `completed_at: <now>` para cerrar la sesión previa, y luego dispara el submit del form con `start_immediately=true`.
- El botón submit normal "Crear e iniciar timer" SHALL estar deshabilitado hasta que el usuario resuelva el conflicto (ya sea deteniendo la activa o navegando de vuelta al dashboard).

#### Scenario: Banner aparece cuando hay sesión activa

- **WHEN** el usuario navega a `/tasks/new` y `useActiveSession` retorna una task con `status='active'` o `'paused'`
- **THEN** SHALL mostrar el banner con el título de la sesión activa
- **THEN** SHALL deshabilitar el botón submit principal

#### Scenario: Click "Detenerla y empezar esta"

- **WHEN** el usuario hace click en **Detenerla y empezar esta** con sesión activa en `status='active'`
- **THEN** SHALL llamar `PATCH /tasks/{active_id}` con `{"completed_at": "<now>"}`
- **AND** SHALL continuar con el submit del form con `start_immediately=true`
- **THEN** SHALL mostrar el modal de éxito habitual

#### Scenario: Sin sesión activa

- **WHEN** `useActiveSession` retorna `null`
- **THEN** SHALL NO mostrar el banner
- **THEN** SHALL permitir el submit normal