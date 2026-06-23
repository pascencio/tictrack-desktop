## Context

TicTrack Desktop es una app Tauri 2 + Nuxt 4 sin backend integrado todavía. El frontend tiene un dashboard con datos hardcoded en `TaskGrid.vue` y el sidebar muestra un botón "Nueva Tarea" sin funcionalidad. No existe HTTP client, no hay variables de ambiente consumidas por la app, y el único comando Tauri registrado es `greet` (placeholder del scaffold).

El usuario definió el diseño de la vista en Stitch (proyecto "Tictrack V2", screen "Nueva Tarea - TicTrack (Logo Actualizado") y pidió implementar esa vista como página dedicada. Simultáneamente pidió que la URL del backend sea configurable y que **no** quede embebida en el bundle JS — esto fuerza el patrón "Rust ejecuta el HTTP, frontend invoca un comando Tauri que se comporta como `$fetch`".

El backend está en construcción por separado. La validación end-to-end la hará el usuario cuando exista. Este change implementa todo el camino excepto el backend en sí.

## Goals / Non-Goals

**Goals:**

- Construir la página `/tasks/new` fiel al diseño Stitch, alineada con la skill `design-system` (dark-first, tokens semánticos, Lucide).
- Exponer un composable `useApi` que parezca `$fetch` para el código de formulario, pero que rutee a través de un comando Tauri `api_request`.
- Garantizar que la URL del backend (`TICTRACK_BACKEND_URL`) **no** quede embebida en el bundle JS — se lee en runtime por Rust desde la env var.
- Mostrar un banner persistente global cuando la env var no está definida, para que el usuario sepa por qué falla.
- Permitir que el usuario cree una tarea con título, descripción opcional, presupuesto de tiempo (slider 15–480 min, step 15) y tags libres.
- Distinguir dos intents de submit ("Crear e iniciar" / "Solo guardar") mediante el campo `start_immediately: boolean` del payload.
- Mostrar un modal de éxito post-creación con dos acciones: "Crear otra" (reset form, queda en `/tasks/new`) o "Ir al dashboard" (navigate a `/`).
- Manejar errores tipados desde Rust: `BackendNotConfigured`, `HttpError`, `ConnectionError`, `SerializationError`.

**Non-Goals:**

- Página de listado de tareas (`/tasks`). Solo `/tasks/new` por ahora; el item de nav "Tareas" redirige allí como placeholder.
- Lógica de timer real (el `ActiveTimerSection` del dashboard sigue siendo mock local). El campo `start_immediately` queda en el payload pero no inicia nada en V1.
- Persistencia de tags entre sesiones (sin backend no hay forma de listar tags existentes).
- Tests automatizados — la validación es manual con el backend cuando exista.
- Lectura dinámica de la env var en caliente — se lee una vez al startup del proceso Rust.

## Decisions

### 1. Rust ejecuta HTTP, frontend expone un composable `$fetch`-like

**Decisión**: el comando Tauri `api_request` toma `{ method, path, body }` desde el frontend y devuelve `{ status, body }` desde Rust. El frontend tiene un composable `useApi()` con `get/post/put/delete` que internamente hace `invoke('api_request', ...)`.

**Por qué**: el usuario pidió explícitamente que la URL no esté en el bundle y que Rust haga la petición, pero que el código del frontend "parezca HTTP directo". Esta estructura cumple ambos:
- El bundle JS no contiene la URL ni el path completo (solo los paths lógicos).
- El código del form lee `await api.post('/tasks', payload)` en vez de `await invoke(...)`.
- Centralizar HTTP en Rust permite luego añadir auth headers, reintentos, logging estructurado, sin tocar cada `.vue`.

**Alternativas consideradas**:

- **Varios comandos tipados (`create_task`, `list_tasks`, ...)**: más type-safe pero requiere tocar Rust por cada endpoint. Descartado por fricción.
- **`$fetch` directo desde el frontend con URL leída de runtimeConfig**: mantiene la URL fuera del bundle solo si la env var se inyecta en build time vía `VITE_API_URL`, que sí queda en el bundle. Descartado porque el usuario prohibió explícitamente que la URL quedara en el bundle.
- **Proxy HTTP dentro de Tauri (puerto local)**: sobre-ingeniería para este caso.

### 2. Env var `TICTRACK_BACKEND_URL`, leída una vez al startup

**Decisión**: el binario Rust lee `TICTRACK_BACKEND_URL` en el setup hook de Tauri, cachea el resultado en un `ApiState` gestionado por `app.manage()`, y expone el chequeo vía `get_backend_url`.

**Por qué**: leer por-request añade overhead y no aporta valor (la URL no cambia en runtime). `app.manage()` es la forma idiomática de Tauri 2 para inyectar estado accesible desde `tauri::State` en los comandos.

**Tipografía**: `TICTRACK` con la ortografía canónica del producto. El bundle id (`app.locallab.ticktrac`) preserva el typo histórico del scaffold inicial, pero la env var de cara al usuario usa la grafía normalizada para evitar fricción en documentación y scripts.

**Alternativas consideradas**:

- **`.env` file parseado en runtime con dotenvy**: útil para dev, pero añade una dependencia. Se puede agregar después si hace falta.
- **Variable de ambiente del sistema operativo (set/export)**: ya funciona sin libs adicionales, solo `std::env::var()`. Lo que usamos.
- **Persistencia en un archivo JSON de config del usuario**: futuro. Por ahora, env var pura al startup.

### 3. Banner persistente global cuando falta la env var

**Decisión**: el layout `default.vue` siempre monta `<MissingConfigBanner />`. El banner invoca `get_backend_url` en mount; si recibe `BackendNotConfigured`, se muestra; si recibe `Ok(url)`, se oculta. El composable `useBackendStatus` cachea el resultado vía `useState()` de Nuxt para que no se vuelva a chequear en cada navegación.

**Por qué**: opción B del exploration. Para una app desktop el "primer submit" puede pasar mucho después del arranque y el usuario no entendería por qué falla sin pista visible. El banner es descubrible y persistente.

**Alternativas consideradas**:

- **Bloqueante al startup (A)**: ruidoso, el usuario ni siquiera podría abrir el dashboard para leer docs.
- **Solo en el primer submit (C)**: silencioso, peor UX.

### 4. Slider de tiempo: shadcn-vue `<Slider>` con gradiente custom

**Decisión**: instalar `pnpm dlx shadcn-vue@latest add slider` y estilizar encima con CSS para el gradiente de fill (`background: linear-gradient(...)`) y los labels de extremos (`15m / 2h / 4h / 8h`).

**Por qué**: el slider reka-nova de shadcn maneja correctamente el range input, eventos, accesibilidad y step. Solo se necesita CSS encima para el look Stitch.

**Alternativas consideradas**:

- **Construir slider desde cero**: reinventa accesibilidad y eventos.
- **Usar `<input type="range">` directo**: pierde accesibilidad y consistencia.

### 5. Tags: input libre, sin presets

**Decisión**: el campo `TagInput` es un input con `placeholder="Añadir tag..."`. Enter (o coma) agrega a la lista. Cada tag es un chip con un botón X para remover. Sin chips predefinidos.

**Por qué**: opción confirmada por el usuario — "que el usuario decida". Sin backend, no hay forma de listar tags existentes.

**Estado interno**: array de strings en el `TaskForm` ref. Se serializa al payload como `string[]`.

### 6. Modal post-creación con shadcn `<Dialog>`

**Decisión**: shadcn-vue `dialog` instalado vía CLI. Título "Tarea creada", descripción con el título de la tarea, dos acciones: "Crear otra" (reset form + cerrar modal) y "Ir al dashboard" (`navigateTo('/')` + cerrar modal).

**Por qué**: opción C del exploration. El workflow típico es crear varias tareas seguidas. El modal permite batch sin perder foco.

**Alternativas consideradas**:

- **Toast + quedarse en /tasks/new (B)**: menos visible el éxito, no refuerza la acción.
- **Navigate inmediato al dashboard (A)**: rompe el flujo de batch.

### 7. Iconos Material Symbols → Lucide

Mapeo usado en esta vista:

| Material Symbol (Stitch) | Lucide (`@lucide/vue`) |
|---|---|
| `add_task` | `ListTodo` |
| `notifications` | `Bell` |
| `account_circle` | `CircleUser` |
| `timer` | `Timer` |
| `search` | `Search` |
| `play_arrow` | `Play` |
| `info` | `Info` |
| `refresh` | `Loader2` |
| `add` | `Plus` |

Los iconos del sidebar (Dashboard, Tareas, Reportes, Integraciones, Configuración, Nueva Tarea) ya están mapeados en `AppSidebar.vue`.

### 8. Validación del form: solo título requerido

**Decisión**: el botón submit queda deshabilitado mientras `title.trim() === ''`. Los demás campos son opcionales (descripción, tags) o tienen default (budget=90min).

**Por qué**: V1, sin backend no hay reglas de negocio adicionales. Se muestra un helper text debajo del input cuando está vacío tras perder foco.

**Alternativas consideradas**:

- **Validación más estricta (rango de tags, longitud máxima, etc.)**: premature sin backend.

### 9. Forward compatibility para persistencia de timer

**Decisión**: el modelo Task del response de `POST /tasks` SHALL incluir campos suficientes para que una capability futura `timer-sessions` (single session activa, estado en backend, semántica "as if not paused") se implemente sin refactorizar el contrato ni el tipo `Task` de TypeScript.

**Por qué**: el usuario pidió que `add-new-task-view` quede preparado para el modelo de persistencia de timer, sin abordar la UI ni el resumen de timer en este change. Definir el shape de datos ahora evita que `timer-sessions` tenga que renegociar el contrato del `POST /tasks`.

**Lo que SÍ incluye este change**: el type `Task` con los campos `status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`, `created_at`, `updated_at`, tipado en `app/types/task.ts`. La función `submit()` del form retorna la `Task` creada desde el backend (aunque la UI no la use aún).

**Lo que NO incluye este change** (queda para `timer-sessions`):

- UI del timer en el dashboard (`ActiveTimerSection.vue`).
- Botones Pausar / Reanudar / Completar con lógica real.
- Cálculo de `elapsed = now − started_at − accumulated_paused_ms`.
- Persistencia entre cierres de la app (llamado a `GET /sessions/active` al iniciar).
- Endpoints adicionales: `PUT /sessions/current`, `GET /sessions/active`.

**Alternativas consideradas**:

- **Dejar el modelo mínimo y agregar campos cuando llegue `timer-sessions`**: peor forward-compat; refactoriza el response y posiblemente el backend.
- **Incluir UI mínima del timer ahora**: viola el Non-Goal explícito del change y agrega scope que el usuario no quiere en esta iteración.

## Task data shape

Contrato del response de `POST {TICTRACK_BACKEND_URL}/tasks`:

```ts
export type TaskStatus = 'pending' | 'active' | 'paused' | 'completed'

export interface Task {
  id: string                              // asignado por backend
  title: string
  description: string | null
  budget_minutes: number                  // 15..480, step 15
  tags: string[]
  status: TaskStatus                      // default 'pending'
  started_at: string | null               // ISO 8601
  paused_at: string | null                // ISO 8601
  completed_at: string | null             // ISO 8601
  accumulated_paused_ms: number           // default 0
  created_at: string                      // ISO 8601
  updated_at: string                      // ISO 8601
}

export interface CreateTaskRequest {
  title: string
  description: string | null
  budget_minutes: number
  tags: string[]
  start_immediately: boolean
}

// CreateTaskResponse es Task (con id y timestamps populados por backend)
export type CreateTaskResponse = Task
```

Reglas de población por el backend:

| Caso del request | `status` en response | `started_at` en response | `created_at` en response |
|---|---|---|---|
| `start_immediately: true` | `'active'` | timestamp actual del backend | mismo timestamp que `started_at` |
| `start_immediately: false` | `'pending'` | `null` | timestamp actual del backend |

El resto de campos (`paused_at`, `completed_at`, `accumulated_paused_ms`, `updated_at`) se inicializan con sus defaults / null al crear la tarea; se actualizarán desde la capability `timer-sessions`.

## Risks / Trade-offs

- **Sin tests automatizados** → cualquier refactor puede romper el contrato con el backend silenciosamente. **Mitigation**: el contrato del payload y del comando Tauri están documentados en `design.md` y `specs/tasks/spec.md`; el usuario valida end-to-end cuando exista el backend.

- **No hay retries ni timeouts configurables en V1** → si el backend está caído, el usuario ve un error inmediato sin posibilidad de reintento automático. **Mitigation**: reqwest ya tiene timeout default de Tauri; agregar retry/timeout configurable es easy follow-up.

- **El bundle JS contiene los paths (`/tasks`, etc.)** → un usuario curioso puede ver a qué endpoints apunta la app. **Mitigation**: aceptable porque los paths son parte del contrato, no del secreto. La URL completa del BFF sí queda protegida.

- **Si el usuario cambia la env var mientras la app corre, no se refleja** → tendría que reiniciar. **Mitigation**: documentado. Mejora futura: recargar config en caliente.

- **CORS no aplica** porque Rust hace el HTTP, no el browser. **Mitigation**: ninguna necesaria.

- **El `reqwest::Client` se construye una sola vez y se reusa** → buena performance, pero si el usuario cambia de red (vpn, etc.) podría haber problemas con keep-alive. **Mitigation**: aceptar en V1, ver si es problema real.

## Design system compliance

### Tokens usados

| Token | Uso |
|---|---|
| `--background` | Fondo de la app y del área del form |
| `--surface-container` | Card glass del form (`.glass-card`) |
| `--surface-container-low` | Sidebar, fondo del header sticky |
| `--surface-variant` | Track del slider, fondo de chips |
| `--primary` | CTA "Crear e iniciar timer", texto activo, fill del slider |
| `--primary-container` | Botón "Nueva Tarea" del sidebar (existente) |
| `--on-primary-container` | Texto sobre `primary-container` |
| `--secondary` | Color de algunos chips y acentos |
| `--tertiary` | Acentos ámbar cuando aplique |
| `--foreground` | Texto principal |
| `--muted-foreground` | Labels, placeholders, hints |
| `--outline-variant` | Bordes sutiles, divisores |
| `--destructive` | Mensajes de error inline |

### Tipografía

| Elemento | Fuente | Clase Tailwind |
|---|---|---|
| Header "Nueva Tarea" | Montserrat | `font-heading text-2xl font-bold text-primary` |
| Title input | Montserrat | `font-heading text-headline-lg` (placeholder e input) |
| Description textarea | Inter | default |
| Time display `01:30:00` | JetBrains Mono | `font-label-mono text-primary` |
| Labels de sección | Inter | `text-body-sm font-medium text-muted-foreground uppercase tracking-wider` |
| Botones CTA | Inter | `font-bold` |
| Tag chips | Inter | `text-sm` |
| Footer meta | Inter | `text-body-sm text-muted-foreground` |
| Atajo `CMD + ENTER` | JetBrains Mono | `font-label-mono` |

### Patrones de componentes

- **Card del form**: `<div class="glass-card rounded-2xl p-xl shadow-2xl">` con borde sutil blanco/5.
- **Inputs underline-only**: `border-0 border-b-2 border-outline-variant/30 focus:border-primary`, fondo transparente, transición de 300ms.
- **Slider**: shadcn `<Slider>` con override del background a `linear-gradient(to right, primary X%, surface-variant X%)` controlado por el value reactivo.
- **Botones**:
  - CTA: `bg-primary text-on-primary font-bold py-lg px-xl rounded-xl hover:brightness-110 active:scale-[0.98]`
  - Secundario: `border border-outline-variant/50 text-muted-foreground hover:bg-surface-variant/30`
- **Tags chips**: `bg-surface-variant/50 text-foreground border border-outline-variant/20 rounded-full` con botón X de remoción.
- **Success modal**: shadcn `<Dialog>` con header, descripción, dos botones (`outline` + `default`).
- **Banner**: `bg-tertiary-container/20 border border-tertiary/30 text-tertiary rounded-xl` con icono `AlertTriangle` y mensaje.

### Anti-patrones evitados

- Cero hex hardcodeados en `.vue` — todo via tokens semánticos.
- Iconos Lucide exclusivamente.
- Dark-first (clase `dark` ya en `<html>` vía `app.vue`).
- Sin sombras negras fuertes — el shadow del card usa tokens o glow primary/20.

## Migration Plan

No aplica — no hay versión previa de esta feature. La app arranca vacía y este change añade la primera integración con backend.

Para correr en local una vez implementado:
1. `TICTRACK_BACKEND_URL=http://localhost:8080 pnpm tauri dev` (o setear la env var de otra forma).
2. Sin la env var, el banner aparece y el form no puede submitir.

## Open Questions

Ninguna pendiente. Las 6 preguntas del exploration original quedaron resueltas, y las decisiones adicionales sobre persistencia de timer también:

1. ✅ Env var: `TICTRACK_BACKEND_URL`
2. ✅ UX sin env var: banner persistente global
3. ✅ Slider: shadcn-vue `<Slider>` estilizado
4. ✅ Submit intent: `start_immediately: bool`
5. ✅ Post-creación: modal con "Crear otra" / "Ir al dashboard"
6. ✅ Tags: input libre, sin presets
7. ✅ Persistencia de timer (forward-compat): response de `POST /tasks` y type `Task` incluyen `status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`. La UI de timer se aborda en la capability futura `timer-sessions`.