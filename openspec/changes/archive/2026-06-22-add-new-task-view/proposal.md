## Why

TicTrack Desktop no tiene forma de crear tareas desde la UI. El botón "Nueva Tarea" del sidebar apunta a nada, los datos del `TaskGrid` están hardcoded y no existe ninguna integración con un backend. El backend está en construcción por separado, así que la UI necesita estar lista y ser la fuente de verdad del contrato `POST /tasks` para cuando exista. Además, la URL del backend no puede quedar embebida en el bundle JS de la app — debe ser configurable por variable de ambiente leída en runtime por el proceso Rust.

## What Changes

- **Nueva página `/tasks/new`** con el formulario de creación de tarea basado en el diseño Stitch "Nueva Tarea - TicTrack (Logo Actualizado)" del proyecto Tictrack V2.
- **Nuevo comando Tauri `api_request`** que ejecuta una petición HTTP desde Rust hacia el backend, manteniendo la URL fuera del bundle JS.
- **Nuevo comando Tauri `get_backend_url`** para que el frontend pueda saber si la variable de ambiente está configurada y mostrar un banner persistente cuando no lo esté.
- **Nuevos módulos Rust** `src-tauri/src/config.rs` y `src-tauri/src/api.rs` con lectura de env var, cliente `reqwest` y tipos de error tipados.
- **Nueva variable de ambiente `TICTRACK_BACKEND_URL`** que apunta al BFF (Backend for Frontend).
- **Nuevo composable `useApi`** que expone una API tipo `$fetch` (`get`, `post`, `put`, `delete`) pero internamente invoca el comando Tauri `api_request`. El código del frontend lee como HTTP directo sin saber que pasa por Rust.
- **Nuevo composable `useBackendStatus`** que comparte el estado de configuración del backend en toda la app.
- **Nuevo componente `MissingConfigBanner`** en el layout default, persistente en todas las páginas, cuando `TICTRACK_BACKEND_URL` no está definida.
- **Nuevo componente `TaskForm`** con sub-componentes `TimeBudgetSlider`, `TagInput` y `SuccessModal`.
- **Sidebar actualizado**: el botón "Nueva Tarea" y el item "Tareas" navegan a `/tasks/new` (no existe página de listado todavía).
- **Dependencias Rust añadidas**: `reqwest` (json, rustls-tls) y `thiserror`.
- **Componentes shadcn-vue añadidos**: `slider` y `dialog`.
- **Mapeo de iconos Material Symbols → Lucide** documentado en design.md para los iconos usados por esta vista.
- **Modelo de Task con campos preparados para persistencia de timer**: el response de `POST /tasks` incluye `status` (`pending | active | paused | completed`), `started_at`, `paused_at`, `completed_at` y `accumulated_paused_ms`, además de `id`, `created_at` y `updated_at`. El frontend tipa el response con la interface completa pero **no** renderiza UI de timer en este change — esa responsabilidad queda para una capability separada (`timer-sessions`).

## Capabilities

### New Capabilities

- `tasks`: Creación de tareas vía formulario en `/tasks/new` con envío a `POST {TICTRACK_BACKEND_URL}/tasks`. Incluye requisito explícito de que la URL del backend no esté en el bundle JS, comportamiento de banner persistente cuando falta la variable de ambiente, y modelo de Task con campos de persistencia de timer (`status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`) preparado para una capability futura `timer-sessions`.

### Modified Capabilities

Ninguna. Esta es la primera capability del proyecto.

## Impact

- **UI nueva**:
  - `app/pages/tasks/new.vue` — nueva ruta
  - `app/components/tasks/TaskForm.vue`
  - `app/components/tasks/TimeBudgetSlider.vue`
  - `app/components/tasks/TagInput.vue`
  - `app/components/tasks/SuccessModal.vue`
  - `app/components/layout/MissingConfigBanner.vue`
- **UI modificada**:
  - `app/components/layout/AppSidebar.vue` — botón "Nueva Tarea" y item "Tareas" ahora son `NuxtLink` a `/tasks/new`
  - `app/layouts/default.vue` — incluye el `MissingConfigBanner`
- **Frontend nuevo**:
  - `app/composables/useApi.ts`
  - `app/composables/useBackendStatus.ts`
- **Rust nuevo**:
  - `src-tauri/src/config.rs` — `AppConfig::from_env()` lee `TICTRACK_BACKEND_URL`
  - `src-tauri/src/api.rs` — `api_request`, `get_backend_url`, `ApiState`, `ApiError`
- **Rust modificado**:
  - `src-tauri/src/lib.rs` — registra los nuevos comandos, inicializa `ApiState` con `reqwest::Client` y la URL del env
  - `src-tauri/Cargo.toml` — añade `reqwest`, `thiserror`
- **Dependencias shadcn-vue**: `slider`, `dialog` instalados vía `pnpm dlx shadcn-vue@latest add slider dialog`
- **Variable de ambiente nueva**: `TICTRACK_BACKEND_URL` (BFF). Sin default. Si no está definida, el banner global aparece y todo intento de llamada falla con error tipado.
- **Validación**: manual por el usuario cuando exista el backend. No se añaden tests automatizados en este change — se verifica que el form arme el payload correcto, que el comando Tauri se invoque con el contrato esperado y que el banner aparezca cuando falta la env var. La integración HTTP end-to-end la valida el usuario con su backend funcionando.
- **Diseño visual**: alineado con la skill `design-system` (dark-first, tokens semánticos, glass-card, fuentes Montserrat/Inter/JetBrains Mono, iconos Lucide). Tras implementar se ejecuta el flujo de `design-verify`.