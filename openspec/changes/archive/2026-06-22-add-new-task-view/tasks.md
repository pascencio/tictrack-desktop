## 1. Rust dependencies

- [x] 1.1 Agregar `reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }` y `thiserror = "1"` a `[dependencies]` en `src-tauri/Cargo.toml`. Verificar que `tauri 2` ya provee `tokio` con feature `rt-multi-thread` (no requiere cambio).

## 2. Rust config module

- [x] 2.1 Crear `src-tauri/src/config.rs` con struct `AppConfig { backend_url: Option<String> }` y método `AppConfig::from_env()` que lee `std::env::var("TICTRACK_BACKEND_URL").ok()`. No falla si la env var falta — devuelve `backend_url = None`.

## 3. Rust api module

- [x] 3.1 Crear `src-tauri/src/api.rs` con struct `ApiState { client: reqwest::Client, backend_url: Option<String> }`.
- [x] 3.2 Definir struct `ApiRequest { method: String, path: String, body: Option<serde_json::Value> }` con `Deserialize`.
- [x] 3.3 Definir struct `ApiResponse { status: u16, body: serde_json::Value }` con `Serialize`.
- [x] 3.4 Definir enum `ApiError` con variantes `BackendNotConfigured`, `HttpError { status: u16, body: String }`, `ConnectionError(String)`, `SerializationError(String)`. Derivar `thiserror::Error` y `Serialize` con `#[serde(tag = "kind", content = "message")]`.
- [x] 3.5 Implementar `#[tauri::command] async fn api_request(req: ApiRequest, state: tauri::State<'_, ApiState>) -> Result<ApiResponse, ApiError>`. Si `state.backend_url es None`, retornar `BackendNotConfigured`. Construir URL como `format!("{base}{path}")` y enviar con `reqwest::Client::post/get/put/delete().json(&body).send()`. Mapear errores: `reqwest::Error` de conexión → `ConnectionError`, respuesta con status >= 400 → `HttpError { status, body }`. Devolver `ApiResponse` con el status y el body parseado como `serde_json::Value`.
- [x] 3.6 Implementar `#[tauri::command] fn get_backend_url(state: tauri::State<'_, ApiState>) -> Result<String, ApiError>`. Si `None`, retornar `BackendNotConfigured`. Si `Some(url)`, retornar `Ok(url.clone())`.

## 4. Tauri command registration

- [x] 4.1 Modificar `src-tauri/src/lib.rs`: agregar `mod config;` y `mod api;` al inicio.
- [x] 4.2 En `tauri::Builder::default()`, agregar `.setup(|app| { ... })` que construye `AppConfig::from_env()`, instancia `reqwest::Client::builder().timeout(Duration::from_secs(30)).build().unwrap()`, y registra `ApiState { client, backend_url: config.backend_url }` con `app.manage(...)`.
- [x] 4.3 Agregar `api::api_request` y `api::get_backend_url` al `invoke_handler!`.

## 5. Frontend shadcn dependencies

- [x] 5.1 Ejecutar `pnpm dlx shadcn-vue@latest add slider --yes` desde la raíz del proyecto. Verificar que se crea `app/components/ui/slider/`.
- [x] 5.2 Ejecutar `pnpm dlx shadcn-vue@latest add dialog --yes`. Verificar que se crea `app/components/ui/dialog/`.
- [x] 5.3 (Opcional) Ejecutar `pnpm dlx shadcn-vue@latest add input label textarea --yes` si los componentes no existen ya en `app/components/ui/`. Verificar antes de instalar.

## 6. Frontend composables

- [x] 6.1 Crear `app/composables/useApi.ts` que exporta `useApi()` retornando `{ get<T>(path), post<T>(path, body), put<T>(path, body), delete<T>(path) }`. Cada método invoca `invoke<ApiResponse>('api_request', { req: { method, path, body: body ?? null } })` y retorna `response.body as T`. Tipar el input con `ApiRequest { method?: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', body?: unknown }`. Si `invoke` rechaza, propagar el `ApiError` (Rust lo serializa con tag `kind`).
- [x] 6.2 Crear `app/composables/useBackendStatus.ts` que exporta `useBackendStatus()`. Internamente usa `useState<{ configured: boolean; url?: string }>('backend-status', () => ({ configured: false }))`. Expone `check()` que llama `await invoke<string>('get_backend_url')`, en éxito setea `{ configured: true, url }`, en error setea `{ configured: false }`. Expone también `status` reactivo. En el primer `check()` desde el cliente, cachear el resultado para no repetir.
- [x] 6.3 Crear `app/types/task.ts` con los types `TaskStatus` (union `'pending' | 'active' | 'paused' | 'completed'`), `Task` (interface con todos los campos: `id`, `title`, `description`, `budget_minutes`, `tags`, `status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`, `created_at`, `updated_at`), `CreateTaskRequest` y `CreateTaskResponse = Task`. Estos types se importan en `useApi.ts`, `TaskForm.vue` y `SuccessModal.vue`. NO se renderiza UI relacionada con los campos de timer en este change — solo se tipa el response del backend.

## 7. MissingConfigBanner component

- [x] 7.1 Crear `app/components/layout/MissingConfigBanner.vue`. En `onMounted`, llamar `check()` de `useBackendStatus`. Renderizar solo si `status.value.configured === false`. Contenido: `bg-tertiary-container/20 border border-tertiary/30 text-tertiary rounded-xl p-md` con icono `AlertTriangle` y texto "Configura `TICTRACK_BACKEND_URL` para habilitar la sincronización con el backend". Posicionado en el layout como primer hijo del `<main>`.

## 8. Layout integration

- [x] 8.1 Modificar `app/layouts/default.vue`: importar `MissingConfigBanner` y renderizarlo como primer elemento dentro de `<main>` antes del `<slot />`. Mantener el resto de la estructura (`min-h-screen`, `AppSidebar`, `ml-60`, etc.) intacta.

## 9. TaskForm component

- [x] 9.1 Crear `app/components/tasks/TaskForm.vue` con estado local: `title: ref('')`, `description: ref('')`, `budgetMinutes: ref(90)`, `tags: ref<string[]>([])`, `pending: ref(false)`, `errorMessage: ref<string | null>(null)`, `successDialogOpen: ref(false)`.
- [x] 9.2 Implementar `TitleInput` inline en el template: `<label>` con `text-body-sm text-muted-foreground uppercase tracking-wider`, `<input>` con clases `bg-transparent border-0 border-b-2 border-outline-variant/30 py-md px-1 font-heading text-headline-lg text-foreground placeholder:text-muted-foreground/40 transition-all focus:border-primary`. Vincular a `v-model="title"`.
- [x] 9.3 Implementar `DescriptionTextarea` inline: label `DETALLES (OPCIONAL)`, `<textarea>` con mismas clases underline pero `font-body-md rows="2"`, placeholder "Describe brevemente los objetivos de esta sesión...".
- [x] 9.4 Implementar `computed` `formattedBudget` que devuelve `${hh}:${mm}:00` con padding de 2 dígitos.
- [x] 9.5 Implementar `isValid` computado: `title.value.trim().length > 0`.
- [x] 9.6 Implementar función `submit(intent: 'start' | 'save')` que setea `pending = true`, `errorMessage = null`, arma payload `CreateTaskRequest`, llama `await api.post<Task>('/tasks', payload)` usando el type de `app/types/task.ts`. La `Task` retornada por el backend se guarda en un `ref<Task>` interno para uso futuro (timer-sessions); en este change NO se renderiza ningún campo de timer en la UI. En éxito: abre `successDialogOpen = true`, resetea form si `intent === 'start'`, deja el form como está si `intent === 'save'`. En error: setea `errorMessage` con mensaje discriminado por `kind` del `ApiError`.

## 10. TimeBudgetSlider component

- [x] 10.1 Crear `app/components/tasks/TimeBudgetSlider.vue` con props `modelValue: number` y emits `update:modelValue`. Internamente usa `<Slider>` de `app/components/ui/slider/` con `:min="15"`, `:max="480"`, `:step="15"`, `:model-value="[modelValue]"`, `@update:model-value="(v) => v[0] !== undefined && $emit('update:modelValue', v[0])"`. Layout: card con `p-lg bg-surface-container/50 rounded-xl border border-outline-variant/10`, label `TIEMPO OBJETIVO` y el formatted display a la derecha. Debajo, labels `15m / 2h / 4h / 8h` con `flex justify-between text-[10px] text-muted-foreground uppercase tracking-tighter`.

## 11. TagInput component

- [x] 11.1 Crear `app/components/tasks/TagInput.vue` con props `modelValue: string[]` y emits `update:modelValue`. Estado local: `currentInput: ref('')`. Layout: card con `p-lg bg-surface-container/50 rounded-xl border border-outline-variant/10`, label `ETIQUETAS`, input con icono `Search` posicionado a la derecha (`absolute right-0 top-1`), placeholder "Añadir tag...". Bind `v-model="currentInput"` con `@keydown.enter.prevent="addTag"`.
- [x] 11.2 Implementar `addTag()`: si `currentInput.value.trim()` no vacío, push al array emitiendo `update:modelValue` y limpia `currentInput`. Evitar duplicados (case-insensitive).
- [x] 11.3 Implementar `removeTag(index)`: splice y emite.
- [x] 11.4 Renderizar lista de chips debajo: `flex flex-wrap gap-xs`, cada chip con `bg-surface-variant/50 text-foreground border border-outline-variant/20 rounded-full px-sm py-1 text-sm` y botón X (`X` icon de Lucide, `size-3`) que llama `removeTag(index)`.

## 12. SuccessModal component

- [x] 12.1 Crear `app/components/tasks/SuccessModal.vue` con props `open: boolean`, `taskTitle: string`. Emits `update:open`, `createAnother`, `goToDashboard`. Usa `<Dialog>` de shadcn (`app/components/ui/dialog/`). Header: `<DialogTitle>Tarea creada</DialogTitle>`. Descripción: `Se creó "{taskTitle}"`. Footer: dos `<Button>` (`variant="outline"` "Crear otra" y `variant="default"` "Ir al dashboard"). El type `Task` se importa desde `app/types/task.ts` aunque no se rendericen sus campos de timer en este componente.

## 13. Page integration

- [x] 13.1 Crear `app/pages/tasks/new.vue` con `definePageMeta({ layout: 'default' })`. Importa `AppHeader`, `TaskForm`, `SuccessModal`. Render: `<AppHeader title="Nueva Tarea" />`, contenedor `mx-auto max-w-3xl space-y-8 p-8`, dentro el `<TaskForm>` envuelto en `<div class="glass-card rounded-2xl p-xl shadow-2xl">`. Footer debajo del card con `flex items-center justify-between text-muted-foreground`: izquierda icono `Info` + "Los timers activos sincronizan automáticamente con Slack", derecha `font-label-mono` con `CMD + ENTER` chip.
- [x] 13.2 Vincular el `<SuccessModal>` dentro del `TaskForm` con `v-model:open` y los dos emits para reset y navegación.

## 14. Sidebar navigation

- [x] 14.1 Modificar `app/components/layout/AppSidebar.vue`: importar `NuxtLink`. Convertir el `<Button>` "Nueva Tarea" en `<NuxtLink to="/tasks/new">` (manteniendo el estilo del botón via `class`). Convertir el item `Tareas` del array `navItems` para usar `to: '/tasks/new'` en vez de `href: '#'`.
- [x] 14.2 Cambiar el render del nav para que use `<NuxtLink>` en vez de `<a>`. Actualizar la lógica de `item.active` para detectar la ruta activa vía `useRoute().path.startsWith(item.to)` (en vez de la flag hardcoded).
- [x] 14.3 Actualizar `navItems`: `Dashboard` con `to: '/'`, `Tareas` con `to: '/tasks/new'`, los demás mantienen `to: '#'` (placeholder).

## 15. Visual verification

- [x] 15.1 Levantar la app con `TICTRACK_BACKEND_URL=http://localhost:8080 pnpm tauri dev` y verificar visualmente la pantalla `/tasks/new` con la skill `design-verify`: comparar contra Stitch "Nueva Tarea - TicTrack (Logo Actualizado)", capturar screenshot, validar checklist (dark-first, tokens semánticos, fuentes correctas, glass-card, iconos Lucide, sin hex hardcodeados, banner oculto cuando env var está seteada).
- [x] 15.2 Levantar la app sin la env var y verificar que el banner aparece en todas las páginas y el submit del form queda bloqueado.
- [x] 15.3 Validación manual end-to-end (cuando exista el backend): usuario envía `POST /tasks` desde su backend mock, confirma que el payload llega correcto y que el modal de éxito aparece.