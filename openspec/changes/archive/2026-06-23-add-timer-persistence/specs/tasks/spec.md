## ADDED Requirements

### Requirement: POST /tasks auto-completa sesión activa previa (single timer)

Cuando `POST {TICTRACK_BACKEND_URL}/tasks` se invoca con `start_immediately: true` y existe una tarea con `status='active'` o `'paused'`, el backend SHALL auto-completarla antes de crear la nueva. Esta regla enforces el contrato de single timer (ver capability `timer-sessions`).

Pasos del backend en orden:

1. Buscar la task con `status='active'` o `'paused'` (si hay más de una, la más reciente por `started_at`).
2. Si la task activa está `paused` con `paused_at = T_pause`, sumar `(now − T_pause)` a su `accumulated_paused_ms` y limpiar `paused_at`. Esto preserva correctamente la duración acumulada antes de cerrar.
3. Actualizar la task activa previa con `status='completed'`, `completed_at=now`, `updated_at=now`.
4. Crear la nueva task como se documenta en el requirement "Crear tarea vía POST /tasks".

Si no existe task activa previa, el backend SHALL proceder directo al paso 4 (creación normal).

El response del `POST /tasks` SHALL ser la Task **nueva** creada (no la auto-completada). El frontend SHALL refrescar `useActiveSession` después de un POST exitoso para reflejar el nuevo estado.

#### Scenario: Hay sesión activa al crear con start_immediately=true

- **WHEN** existe una task con `status='active'`, `started_at=T_start`, `accumulated_paused_ms=0`
- **AND** el frontend envía `POST /tasks` con `start_immediately=true` y body `{"title": "Nueva", ...}`
- **THEN** el backend SHALL actualizar la task previa a `status='completed'`, `completed_at=now`
- **AND** SHALL crear la nueva task con `status='active'`, `started_at=now`
- **THEN** el response SHALL contener la nueva task

#### Scenario: Hay sesión pausada al crear con start_immediately=true

- **WHEN** existe una task con `status='paused'`, `started_at=T_start`, `paused_at=T_pause`, `accumulated_paused_ms=X`
- **AND** el frontend envía `POST /tasks` con `start_immediately=true`
- **THEN** el backend SHALL sumar `(now − T_pause)` a `accumulated_paused_ms` (resultando `X + (now − T_pause)`), limpiar `paused_at`, actualizar `status='completed'`, `completed_at=now`
- **AND** SHALL crear la nueva task normalmente

#### Scenario: No hay sesión activa al crear con start_immediately=true

- **WHEN** no existe task con `status='active'` o `'paused'`
- **AND** el frontend envía `POST /tasks` con `start_immediately=true`
- **THEN** el backend SHALL crear la nueva task normalmente sin tocar otras tasks

### Requirement: PATCH /tasks/:id para transiciones de estado

El sistema SHALL exponer `PATCH {TICTRACK_BACKEND_URL}/tasks/{id}` para mutar los campos de timer (`paused_at`, `resumed_at`, `completed_at`) de una task existente. El body SHALL contener exactamente uno de los tres campos para indicar la transición:

```jsonc
// Pausar
{ "paused_at": "2026-06-22T20:00:00Z" }
// Reanudar
{ "resumed_at": "2026-06-22T20:30:00Z" }
// Completar
{ "completed_at": "2026-06-22T21:00:00Z" }
```

El backend SHALL:

- Validar que la transición es legal según el state machine (`active ↔ paused`, `active|paused → completed`).
- Computar el nuevo `status`, `accumulated_paused_ms`, `paused_at`, `completed_at` atómicamente.
- Retornar `200 OK` con la Task actualizada en JSON.
- Retornar `409 Conflict` con body `{"error": "invalid_transition", "from": "<current>", "to": "<requested>"}` si la transición no es válida.
- Retornar `404 Not Found` si la task no existe.

Reglas de cómputo detalladas en `specs/timer-sessions/spec.md` (Requirement "Transiciones de estado vía PATCH /tasks/:id").

El frontend SHALL invocar este endpoint vía `useApi().patch('/tasks/{id}', body)` desde la UI del timer (`ActiveTimerSection.vue`) y desde el banner de sesión activa en `/tasks/new`.

#### Scenario: PATCH pausa legal

- **WHEN** la task tiene `status='active'` y el frontend envía `PATCH /tasks/{id}` con `{"paused_at": "<now>"}`
- **THEN** el backend SHALL retornar `200 OK` con la task actualizada (`status='paused'`, `paused_at=<now>`)

#### Scenario: PATCH pausa sobre task ya pausada

- **WHEN** la task tiene `status='paused'`
- **AND** el frontend envía `PATCH /tasks/{id}` con `{"paused_at": "<now>"}`
- **THEN** el backend SHALL retornar `409 Conflict` con `{"error": "invalid_transition", "from": "paused", "to": "paused"}`

#### Scenario: PATCH sobre task inexistente

- **WHEN** el frontend envía `PATCH /tasks/inexistente_id` con un body válido
- **THEN** el backend SHALL retornar `404 Not Found`

#### Scenario: PATCH complete desde active

- **WHEN** la task tiene `status='active'` y `accumulated_paused_ms=X`
- **AND** el frontend envía `PATCH /tasks/{id}` con `{"completed_at": "<now>"}`
- **THEN** el backend SHALL retornar `200 OK` con `status='completed'`, `completed_at=<now>`, `accumulated_paused_ms=X` (sin cambios)

#### Scenario: PATCH complete desde paused preserva tiempo pausado

- **WHEN** la task tiene `status='paused'`, `paused_at=T_pause`, `accumulated_paused_ms=X`
- **AND** el frontend envía `PATCH /tasks/{id}` con `{"completed_at": "T2"}`
- **THEN** el backend SHALL retornar `200 OK` con `status='completed'`, `completed_at=T2`, `accumulated_paused_ms=X + (T2 − T_pause)`, `paused_at=null`