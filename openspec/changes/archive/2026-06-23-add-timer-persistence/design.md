## Context

El change `add-new-task-view` (archivado) dejó listo el modelo `Task` con `status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`, y el comando Rust `api_request` que sirve como proxy HTTP genérico al backend. La UI actual del timer (`app/components/dashboard/ActiveTimerSection.vue`) sigue siendo un mock local con `setInterval(1000)` que arranca en valores hardcoded (`hours=1, minutes=49, seconds=45`) y se pierde al cerrar la app.

Para que TicTrack sea un time tracker confiable, el timer debe:
- Sobrevivir cierres de la app (cierre = no pausa; el conteo continúa)
- Tener source of truth en el backend (no estado local)
- Respetar el contrato single timer (un solo activo a la vez, auto-stop del anterior)
- Distinguir pausa real de usuario vs. cierre de app

El backend es externo a este repo. Para el mock local, json-server v0.17 + custom middleware ya está en uso desde `add-new-task-view`.

## Goals / Non-Goals

**Goals:**

- Persistir el estado del timer en el backend (sin estado local de timer en el desktop app).
- Al reabrir la app, el timer reactivo muestra el tiempo correcto sin pérdida.
- Single timer enforced: no puede haber dos sesiones activas concurrentes.
- Pausa real de usuario (excluye tiempo pausado del elapsed).
- Reemplazar el mock `ActiveTimerSection.vue` por una versión conectada al backend.
- Cobertura del flujo completo: pausar → reanudar → completar, más abrir app con sesión activa en background.

**Non-Goals:**

- Reportes / analytics de tiempo registrado (futuro change).
- Sincronización offline-first con queue local (futuro; depende de cambios fuera de scope).
- Auto-detección de idle / away (futuro).
- Notificaciones cuando una sesión pasa el `budget_minutes` (futuro change, no es pre-requisito).
- Límite de tiempo configurable por usuario (futuro).

## Decisions

### 1. Modelo de pausa A — pausa real que excluye tiempo

**Decisión**: el campo `paused_at` se popula al pausar; al reanudar, el backend suma `(resumed_at − paused_at)` a `accumulated_paused_ms` y limpia `paused_at`. El frontend calcula `elapsed = now − started_at − accumulated_paused_ms` cuando está active, y muestra `paused_at` (tiempo congelado) cuando está paused.

**Por qué**: el botón "Pausa" en `ActiveTimerSection.vue` actual sugiere semántica de pausa real. "Como si no se hubiera pausado" se interpreta como: el **cierre de app** no pausa, pero la **pausa de usuario** sí.

**Alternativas consideradas**:

- **Modelo B — sin pausa**: el botón "Pausa" se reemplaza por "Detener y empezar nuevo". Más simple pero contradice el patrón de time trackers estándar y la UI existente. Descartado.
- **Modelo A pero con flag `is_paused_by_app_close`**: complica el state machine sin valor real, porque el cierre de app no requiere acción del usuario para "reanudar". Descartado.

### 2. Single timer enforced server-side via auto-complete

**Decisión**: cuando `POST /tasks` llega con `start_immediately=true` y existe una sesión activa (status='active' o 'paused'), el backend SHALL auto-completarla (`completed_at = now`, status='completed') antes de crear la nueva. Si la anterior estaba paused, primero la resume virtualmente (`accumulated_paused_ms += now − paused_at`, clear `paused_at`) para preservar la duración acumulada correctamente.

**Por qué**: time trackers estándar (Toggl, Clockify) usan este patrón — al cambiar de tarea, la anterior se cierra y la nueva arranca. Es predecible, sin UI extra de confirmación, y mantiene el historial completo.

**Alternativas consideradas**:

- **Refuse con 409 Conflict**: requiere UX de "primero completá la activa". Más fricción sin valor claro.
- **Deshabilitar "Crear e iniciar timer" cuando hay activa**: el usuario debe parar la activa primero. Más fricción todavía, y requiere un flow separado para detener.
- **Auto-complete con confirmación**: el backend pregunta al frontend antes de cerrar. Más complejidad de orquestación; el patrón "Toggl-like" no lo necesita.

### 3. Sesión = Task con `status != 'pending'`. Sin colección separada

**Decisión**: no creamos una entidad `Session`. La sesión activa ES la Task cuyo status es `'active'` o `'paused'`. Las transiciones de estado son PATCH sobre el recurso task existente.

**Por qué**: minimiza surface area, evita duplicación de datos, y permite que el historial completo se obtenga con `GET /tasks` cuando se implemente. El type `Task` ya tiene todos los campos.

**Alternativas consideradas**:

- **Colección `/sessions` separada**: complica el modelo, requiere joins, y agrega migraciones cuando la task original se edita.
- **Tabla de eventos aparte**: innecesario para V1; los timestamps en la task son suficientes.

### 4. State machine: `pending → active ↔ paused → completed`

```
pending --start_immediately--> active
pending --start_immediately--> active (transición auto-completa previa)
active --PATCH paused_at--> paused
paused --PATCH resumed_at--> active
active --PATCH completed_at--> completed
paused --PATCH completed_at--> completed (resolución de paused_at primero)
```

**Decisión**: las transiciones son siempre forward (pending no puede ir a paused directamente; completed es terminal). El backend valida cada PATCH y rechaza transiciones inválidas con 409.

**Por qué**: mantiene la invariante simple y previene estados inconsistentes. El frontend no necesita conocer todas las reglas — confía en el backend y muestra el error si lo hay.

### 5. Re-fetch cada 60s en lugar de polling agresivo

**Decisión**: `useActiveSession` hace un fetch inicial en `onMounted` y luego `setInterval` cada 60s. El cálculo de `elapsed` es local (basado en `started_at + accumulated_paused_ms`), así que no requiere updates sub-segundo del backend. El tick local cada 1s en `ActiveTimerSection.vue` actualiza el display sin requests.

**Por qué**: el timer display debe actualizarse cada segundo, pero el backend no necesita enterarse. Una frecuencia de 60s cubre drift entre cliente y servidor (corrección de tiempo) sin carga innecesaria.

**Alternativas consideradas**:

- **Polling cada 1s**: demasiado para un backend mockeable.
- **WebSocket / SSE**: innecesario en V1; podemos agregar si la app lo requiere.
- **Sin re-fetch**: el cliente podría mostrar tiempo desfasado si el usuario mueve el reloj del sistema. El re-fetch cada 60s lo corrige.

### 6. Endpoints Rust sin cambios estructurales

`api_request` ya cubre GET/POST/PUT/PATCH/DELETE con cualquier path. Los nuevos endpoints se invocan vía:

- `api.get('/sessions/active')` → `GET {base}/sessions/active`
- `api.patch('/tasks/{id}', body)` → `PATCH {base}/tasks/{id}`

**No se agregan comandos Tauri nuevos**. La spec solo documenta el contrato HTTP.

### 7. Mock json-server: middleware-based

**Decisión**: extender el `middleware.js` existente con tres handlers:

- `POST /tasks` (override del actual): si `start_immediately=true` y hay tarea con `status='active'` o `'paused'`, auto-completarla primero.
- `GET /sessions/active`: filtrar tasks y devolver la primera con `status='active'` o `'paused'`.
- `PATCH /tasks/:id`: validar el campo del body y computar transiciones (status, accumulated_paused_ms, completed_at).

**Por qué**: json-server es flat-file, sin lógica de servidor real. Las transiciones de estado se simulan en middleware para mantener el mock sincronizado con el contrato esperado por el frontend.

## Risks / Trade-offs

- **Conflicto de transición no se prueba en V1** → el backend rechaza `PATCH` con transiciones inválidas con 409, pero el frontend actual no expone este caso. **Mitigation**: scenarios en spec cubren el comportamiento esperado; el usuario lo descubre naturalmente al intentar pausar dos veces seguidas.

- **El re-fetch de 60s puede quedar desfasado** si el usuario edita la duración manualmente (no aplica en V1, no hay UI de edición). **Mitigation**: cuando llegue el editor de tareas, el re-fetch se reduce a 5s.

- **Auto-complete silencioso puede sorprender** al usuario que no esperaba que la tarea anterior se cerrara al iniciar una nueva. **Mitigation**: `TaskForm.vue` muestra el banner "Ya tenés una sesión activa: <título>" antes del submit, dejando claro qué va a pasar.

- **Sin tests automatizados** — toda la validación es manual con el mock. **Mitigation**: la lógica de transición está concentrada en 3 endpoints; los scenarios en spec son testeables con curl sin UI.

- **`accumulated_paused_ms` puede perder precisión** si el backend guarda milisegundos pero el frontend redondea. **Mitigation**: backend siempre retorna el valor exacto; frontend muestra en formato HH:MM:SS con truncamiento.

## Migration Plan

No aplica — la app no tiene versión previa con timer real. El cambio es aditivo sobre el estado mock.

Para correr:
```bash
# 1. Backend mock (json-server v0.17 + middleware)
json-server db.json --port 8080 --middlewares ./middleware.js

# 2. App
TICTRACK_BACKEND_URL=http://localhost:8080 pnpm tauri dev
```

Verificación end-to-end:
1. Abrir la app, crear una tarea con "Crear e iniciar timer" → `ActiveTimerSection` muestra la tarea con timer corriendo.
2. Cerrar la app. Reabrir → `ActiveTimerSection` muestra la misma tarea con tiempo acumulado (incluyendo el tiempo que la app estuvo cerrada).
3. Click Pausa → display se congela. Click Reanudar → display continúa. Click Completar → task pasa a `status='completed'` y `ActiveTimerSection` muestra el estado vacío.
4. Intentar crear otra tarea con "Crear e iniciar timer" mientras hay una activa → banner aparece, la anterior se auto-completa, la nueva arranca.

## Open Questions

Ninguna pendiente. Decisiones tomadas con recomendación explícita:

1. ✅ Pausa: modelo A (real pause).
2. ✅ Single timer: auto-complete server-side.
3. ✅ Sesión = Task con status != pending.
4. ✅ Re-fetch cada 60s.
5. ✅ Mock: middleware-based en json-server.