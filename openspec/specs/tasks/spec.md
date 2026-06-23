# tasks Specification

## Purpose
TBD - created by archiving change add-new-task-view. Update Purpose after archive.
## Requirements
### Requirement: Crear tarea vía POST /tasks

El sistema SHALL enviar las tareas creadas por el usuario a `POST {TICTRACK_BACKEND_URL}/tasks` desde el proceso Rust de Tauri (no desde el bundle JS). El payload SHALL contener los siguientes campos:

- `title`: string requerido, no vacío.
- `description`: string opcional. Si el usuario no la llena, SHALL enviar `null`.
- `budget_minutes`: integer en el rango `[15, 480]` con `step` 15.
- `tags`: array de strings. Puede estar vacío.
- `start_immediately`: boolean. `true` cuando el usuario hace click en "Crear e iniciar timer", `false` cuando hace click en "Solo guardar".

El frontend SHALL invocar el comando Tauri `api_request` con `path = "/tasks"`, `method = "POST"` y `body` igual al payload descrito. El proceso Rust SHALL construir la URL final como `format!("{base_url}{path}")` donde `base_url` proviene de la variable de ambiente `TICTRACK_BACKEND_URL`.

#### Scenario: Submit válido con "Crear e iniciar timer"

- **WHEN** el usuario completa el título "Refactor API", deja la descripción vacía, pone `budget_minutes = 90`, agrega los tags `["backend", "p1"]` y hace click en "Crear e iniciar timer"
- **THEN** el frontend SHALL invocar `api_request` con `path = "/tasks"`, `method = "POST"` y `body = { title: "Refactor API", description: null, budget_minutes: 90, tags: ["backend", "p1"], start_immediately: true }`
- **THEN** el proceso Rust SHALL hacer `POST {TICTRACK_BACKEND_URL}/tasks` con ese body en JSON
- **THEN** el frontend SHALL mostrar un modal de éxito con el título de la tarea creada

#### Scenario: Submit válido con "Solo guardar"

- **WHEN** el usuario completa el título "Daily" con `start_immediately = false` (click en "Solo guardar")
- **THEN** el payload SHALL contener `start_immediately: false`
- **THEN** el proceso Rust SHALL hacer `POST {TICTRACK_BACKEND_URL}/tasks` con ese body

#### Scenario: Submit con título vacío

- **WHEN** el usuario no completa el campo título
- **THEN** el botón submit SHALL estar deshabilitado y el comando Tauri SHALL NO ser invocado

### Requirement: Task model preparado para persistencia de timer

El response de `POST {TICTRACK_BACKEND_URL}/tasks` SHALL incluir los siguientes campos adicionales al cuerpo creado, de modo que una capability futura `timer-sessions` (single session activa, estado en backend, semántica "as if not paused") pueda operar sobre la misma entidad `Task` sin refactorizar el contrato:

- `id`: string. Identificador único asignado por el backend. No nullable.
- `status`: enum con valores `pending | active | paused | completed`. No nullable. Default `pending`.
- `started_at`: timestamp en formato ISO 8601. Nullable. Populado cuando la tarea pasa a estado `active`.
- `paused_at`: timestamp en formato ISO 8601. Nullable. Populado cuando la tarea está en estado `paused`.
- `completed_at`: timestamp en formato ISO 8601. Nullable. Populado cuando la tarea pasa a estado `completed`.
- `accumulated_paused_ms`: integer >= 0. No nullable. Default `0`.
- `created_at`: timestamp en formato ISO 8601. No nullable.
- `updated_at`: timestamp en formato ISO 8601. No nullable.

Reglas de población cuando se crea la tarea:

- Si el request trae `start_immediately: true`, el response SHALL tener `status = 'active'` y `started_at` con el timestamp ISO 8601 del momento de creación en el backend.
- Si el request trae `start_immediately: false`, el response SHALL tener `status = 'pending'` y `started_at = null`.

El frontend SHALL tipar el response del `POST /tasks` con la interface `Task` que incluye los campos listados. El frontend SHALL NO renderizar UI relacionada con estos campos en este change (timer, pausa, elapsed, estados); esa UI es responsabilidad de la capability `timer-sessions`.

#### Scenario: Response con start_immediately true

- **WHEN** el frontend envía `POST /tasks` con `start_immediately: true` y el backend responde con status 2xx
- **THEN** el response SHALL contener `status: 'active'`
- **THEN** el response SHALL contener `started_at` con un string ISO 8601 válido (parseable por `new Date()`)
- **THEN** el response SHALL contener `paused_at: null`, `completed_at: null`, `accumulated_paused_ms: 0`

#### Scenario: Response con start_immediately false

- **WHEN** el frontend envía `POST /tasks` con `start_immediately: false` y el backend responde con status 2xx
- **THEN** el response SHALL contener `status: 'pending'`
- **THEN** el response SHALL contener `started_at: null`
- **THEN** el response SHALL contener `paused_at: null`, `completed_at: null`, `accumulated_paused_ms: 0`

#### Scenario: Type Task del frontend incluye todos los campos de timer

- **WHEN** se define el type TypeScript `Task` en `app/types/task.ts`
- **THEN** SHALL incluir `status: 'pending' | 'active' | 'paused' | 'completed'`
- **THEN** SHALL incluir `started_at: string | null`
- **THEN** SHALL incluir `paused_at: string | null`
- **THEN** SHALL incluir `completed_at: string | null`
- **THEN** SHALL incluir `accumulated_paused_ms: number`
- **THEN** SHALL incluir `created_at: string` y `updated_at: string` no nulables

### Requirement: URL del backend no embebida en el bundle JS

El bundle JavaScript SHALL NO contener la URL completa del backend (origen, host, puerto, protocolo). La URL SHALL ser leída únicamente por el proceso Rust desde la variable de ambiente `TICTRACK_BACKEND_URL` al momento del startup.

#### Scenario: Bundle inspeccionado no contiene la URL

- **WHEN** se inspecciona el contenido del directorio `dist/` después de `pnpm generate`
- **THEN** ningún archivo `.js` SHALL contener el valor de `TICTRACK_BACKEND_URL` (sin importar qué valor se le haya asignado)

#### Scenario: Cambio de URL sin rebuild

- **WHEN** el operador cambia la variable `TICTRACK_BACKEND_URL` y reinicia la app
- **THEN** la app SHALL usar la nueva URL sin necesidad de recompilar el frontend

### Requirement: Banner persistente cuando falta TICTRACK_BACKEND_URL

El sistema SHALL mostrar un banner persistente en todas las páginas de la app si la variable de ambiente `TICTRACK_BACKEND_URL` no está definida al momento del startup del proceso Rust. El banner SHALL incluir:

- Icono de advertencia.
- Mensaje: "Configura `TICTRACK_BACKEND_URL` para habilitar la sincronización con el backend".
- Estado visual diferenciable del contenido normal (color `tertiary` o `destructive`, borde sutil).

#### Scenario: Banner visible al iniciar sin env var

- **WHEN** el usuario lanza la app sin definir `TICTRACK_BACKEND_URL`
- **THEN** el banner SHALL aparecer en la parte superior del contenido principal en todas las páginas (incluyendo `/` y `/tasks/new`)
- **THEN** el botón submit del form SHALL estar deshabilitado

#### Scenario: Banner oculto cuando env var está definida

- **WHEN** el usuario lanza la app con `TICTRACK_BACKEND_URL=http://localhost:8080`
- **THEN** el banner SHALL NO aparecer
- **THEN** el botón submit del form SHALL estar habilitado cuando el título esté completo

### Requirement: Errores del backend comunicados al usuario

El proceso Rust SHALL mapear los errores de la petición HTTP a un tipo `ApiError` serializable que el frontend pueda discriminar. El frontend SHALL mostrar el mensaje de error apropiado según el tipo:

- `BackendNotConfigured`: cubierto por el banner persistente (no se muestra inline).
- `HttpError { status, body }`: mensaje inline en el form con el código de estado y (si está presente) el cuerpo del error.
- `ConnectionError`: mensaje inline indicando que no se pudo contactar al backend.
- `SerializationError`: mensaje inline indicando que la respuesta del backend no es válida.

#### Scenario: HTTP 400 desde el backend

- **WHEN** el backend responde con status 400 y body `{"error": "title too short"}`
- **THEN** el frontend SHALL mostrar un mensaje de error inline en el form conteniendo "400" y "title too short"

#### Scenario: Backend no alcanzable

- **WHEN** la petición falla porque el backend no está corriendo
- **THEN** el frontend SHALL mostrar un mensaje de error inline: "No se pudo conectar con el backend"

### Requirement: Modal de éxito con acciones "Crear otra" e "Ir al dashboard"

Después de una creación exitosa, el sistema SHALL mostrar un modal (Dialog) con:

- Título: "Tarea creada".
- Descripción con el título de la tarea recién creada.
- Acción primaria: "Crear otra" — cierra el modal y resetea el formulario (mantiene al usuario en `/tasks/new`).
- Acción secundaria: "Ir al dashboard" — cierra el modal y navega a `/`.

#### Scenario: Click en "Crear otra"

- **WHEN** el usuario hace click en "Crear otra" en el modal de éxito
- **THEN** el modal SHALL cerrarse
- **THEN** el formulario SHALL volver a su estado inicial (título vacío, descripción vacía, `budget_minutes = 90`, `tags = []`)
- **THEN** la URL SHALL seguir siendo `/tasks/new`

#### Scenario: Click en "Ir al dashboard"

- **WHEN** el usuario hace click en "Ir al dashboard" en el modal de éxito
- **THEN** el modal SHALL cerrarse
- **THEN** la app SHALL navegar a `/`

### Requirement: Slider de tiempo objetivo con rango y granularidad definidos

El sistema SHALL exponer un control de tipo slider para el campo `budget_minutes` con los siguientes parámetros:

- Valor mínimo: 15 (minutos).
- Valor máximo: 480 (minutos, equivalente a 8 horas).
- Step: 15 minutos.
- Valor inicial: 90 minutos.

El sistema SHALL mostrar el valor formateado como `HH:MM:00` (por ejemplo, `01:30:00`) en todo momento.

#### Scenario: Render inicial del slider

- **WHEN** el usuario navega a `/tasks/new`
- **THEN** el slider SHALL tener valor `90`
- **THEN** el display SHALL mostrar `01:30:00`

#### Scenario: Ajuste del slider

- **WHEN** el usuario mueve el slider a `240`
- **THEN** el display SHALL mostrar `04:00:00`
- **THEN** el campo `budget_minutes` del payload SHALL valer `240` al hacer submit

### Requirement: Tags como input libre

El sistema SHALL permitir al usuario agregar tags libres mediante un input de texto. Las reglas SHALL ser:

- Presionar `Enter` SHALL agregar el contenido del input (sin espacios al inicio/final) a la lista de tags.
- El input SHALL limpiarse después de agregar.
- Cada tag SHALL mostrarse como un chip con un botón (X) para removerla de la lista.
- El array `tags` del payload SHALL contener exactamente los strings agregados.

#### Scenario: Agregar tag con Enter

- **WHEN** el usuario escribe "backend" en el input y presiona Enter
- **THEN** SHALL aparecer un chip con el texto "backend"
- **THEN** el input SHALL quedar vacío

#### Scenario: Remover tag con X

- **WHEN** el usuario hace click en el botón X de un chip existente
- **THEN** el chip SHALL desaparecer
- **THEN** el tag SHALL no incluirse en el payload del submit

### Requirement: Rutas en inglés, UI en español

Las rutas de navegación SHALL estar en inglés (`/tasks/new`, `/`). Los textos visibles al usuario (labels, placeholders, botones, mensajes de error, banner) SHALL estar en español.

#### Scenario: Ruta y copy de la página

- **WHEN** el usuario navega a la página de creación
- **THEN** la URL SHALL ser `/tasks/new`
- **THEN** el header SHALL leer "Nueva Tarea"
- **THEN** el placeholder del título SHALL ser "¿En qué vas a trabajar hoy?"

### Requirement: Sidebar enlaza a /tasks/new

El botón "Nueva Tarea" del sidebar y el item de navegación "Tareas" SHALL ser enlaces a `/tasks/new`. Cuando la ruta activa sea `/tasks/new` o cualquier subruta de `/tasks/*`, el item "Tareas" SHALL mostrar el estado visual activo (borde derecho primary, fondo `primary-container/10`, texto `primary`, font-bold) y el item "Dashboard" SHALL mostrar estado inactivo.

#### Scenario: Click en "Nueva Tarea"

- **WHEN** el usuario hace click en el botón "Nueva Tarea" del sidebar
- **THEN** la app SHALL navegar a `/tasks/new`

#### Scenario: Click en item "Tareas"

- **WHEN** el usuario hace click en el item "Tareas" del sidebar
- **THEN** la app SHALL navegar a `/tasks/new`

#### Scenario: Estado activo en /tasks/new

- **WHEN** la ruta activa es `/tasks/new`
- **THEN** el item "Tareas" SHALL tener borde `border-r-4 border-primary`, fondo `bg-primary-container/10`, texto `text-primary font-bold`
- **THEN** el item "Dashboard" SHALL tener estado inactivo (texto `text-muted-foreground`, sin borde primario)

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

