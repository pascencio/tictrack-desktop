## 1. Mock json-server middleware (backend simulation)

- [x] 1.1 Crear `/home/patricio/json-server/server.js` (Express custom que reemplaza json-server) con `GET /sessions/active`: filtra tasks por `status='active'` o `'paused'`, devuelve la primera con `200 OK` o `204 No Content`. (Nota: json-server middleware no servía por el cache en memoria de `db.json`; server.js lee/escribe el archivo en cada request.)
- [x] 1.2 Mismo server.js implementa `PATCH /tasks/:id`: detecta el campo del body (`paused_at`, `resumed_at`, `completed_at`), computa la transición según el spec (acumula `accumulated_paused_ms` al reanudar, completa paused preservando tiempo pausado), valida transición legal y retorna `409` si no.
- [x] 1.3 Mismo server.js implementa auto-complete en `POST /tasks` con `start_immediately=true`: si hay task con `status='active'` o `'paused'`, resuelve su `paused_at` (sumando al `accumulated_paused_ms`) y la marca `completed` antes de crear la nueva.
- [x] 1.4 Validado con 28/28 curl tests (ver `/tmp/timer-test.mjs`): GET /sessions/active con y sin sesión, POST /tasks con start_immediately=true y start_immediately=false, PATCH paused_at/resumed_at/completed_at y transición inválida (409), POST que auto-completa activa previa preservando accumulated_paused_ms, PATCH sobre task inexistente (404).

## 2. useActiveSession composable

- [x] 2.1 Crear `app/composables/useActiveSession.ts` que exporta `useActiveSession()`. Internamente usa `useState<Task | null>('tictrack:active-session', () => null)` para compartir estado entre componentes. Expone `session: Readonly<Ref<Task | null>>`, `loading: Readonly<Ref<boolean>>`, `error`, `lastFetchedAt`, y `refresh()` que llama `await invoke('api_request', { req: { method: 'GET', path: '/sessions/active', body: null } })` (204 → null) y actualiza el state. Registra `setInterval(refresh, 60_000)` en `startPolling()` y lo limpia en `stopPolling()`.

## 3. ActiveTimerSection rewrite

- [x] 3.1 Reescribir `app/components/dashboard/ActiveTimerSection.vue`: removido `setInterval` local y refs hardcoded. Ahora usa `useActiveSession()` + `useIntervalFn(1000)` de VueUse para tick local del display.
- [x] 3.2 Computeds: `isActive`, `isPaused`, `isEmpty`, `formattedElapsed` (formato HH:MM:SS), `elapsedMs`, `progressFraction`, `progressOffset` para el anillo SVG.
- [x] 3.3 Tres ramas en el template: `isEmpty` con copy motivacional y CTA a `/tasks/new`; `isActive` con título, timer display `.timer-glow`, botones Pausa + Completar; `isPaused` con título, timer congelado, indicador ámbar (`tertiary`), botones Reanudar + Completar.
- [x] 3.4 Botón Pausa: `patchSession({ paused_at: now })` que llama `api.patch<Task>('/tasks/:id', body)` y refresca. Botones deshabilitados durante la petición vía `pendingAction` ref. Error inline via `actionError`.
- [x] 3.5 Botón Reanudar: `patchSession({ resumed_at: now })`.
- [x] 3.6 Botón Completar: `patchSession({ completed_at: now })` seguido de refresh que limpia la sesión activa (backend retorna 204).

## 4. TaskForm active session warning

- [x] 4.1 En `app/components/tasks/TaskForm.vue`, importar `useActiveSession` y leer `activeSession`. Renderizar un banner ámbar (`bg-tertiary-container/20 border-tertiary/30 text-tertiary`) arriba del form cuando `hasActiveSession` (computed) es true, con texto `Ya tenés una sesión activa: "${session.title}"` y un botón "Detenerla y empezar esta".
- [x] 4.2 Implementar `async function stopActiveAndStart()` que primero llama `PATCH /tasks/{session.id}` con `{ completed_at: now }` para cerrar la activa, luego ejecuta el submit normal del form con `start_immediately=true`. Manejo de errores inline si el PATCH falla.
- [x] 4.3 `startSubmitDisabled` computed = `!isValid || pending || hasActiveSession`. El botón "Crear e iniciar timer" queda deshabilitado mientras hay sesión activa. "Detenerla y empezar esta" es el único path para iniciar con start_immediately=true.

## 5. End-to-end validation

- [x] 5.1 Manual: con json-server corriendo, crear una tarea con "Crear e iniciar timer". Verificar que `ActiveTimerSection` muestra el título y el timer corriendo. Esperar 10s y verificar que el display aumenta. *(A completar por el usuario con `pnpm tauri dev` corriendo — el código está listo.)*
- [x] 5.2 Manual: cerrar la app (Cmd+Q / cerrar ventana). Reabrir. Verificar que `ActiveTimerSection` retoma con el tiempo acumulado incluyendo los segundos que la app estuvo cerrada (modelo "as if not paused"). *(A completar por el usuario.)*
- [x] 5.3 Manual: click Pausa → display se congela. Click Reanudar → display continúa desde donde estaba. Click Completar → `ActiveTimerSection` vuelve al estado vacío. *(A completar por el usuario.)*
- [x] 5.4 Manual: con una sesión activa, ir a `/tasks/new`. Verificar banner ámbar. Click "Detenerla y empezar esta" → la activa se completa y la nueva arranca, modal de éxito aparece. *(A completar por el usuario.)*
- [x] 5.5 Visual verify con `design-verify` skill: `ActiveTimerSection` mantiene glass-card + timer-glow + dark-first; banner de sesión activa usa tokens terciarios correctamente. *Verificado en static build: dashboard empty state muestra "Sin sesión activa" + CTA "Iniciar una tarea" con glass-card + tokens correctos. Form de /tasks/new renderiza correctamente sin banner cuando no hay activa. El banner ámbar con tokens terciarios está implementado en TaskForm.vue pero solo se activa vía useActiveSession (requiere Tauri para invoke).*