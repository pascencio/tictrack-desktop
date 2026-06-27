## 1. useTaskList composable

- [x] 1.1 Crear `app/composables/useTaskList.ts` que exporta `useTaskList()`. Internamente usa `useState<Task[]>('tictrack:task-list', () => [])`, `useState<boolean>('tictrack:task-list:loading', () => false)`, `useState<string | null>('tictrack:task-list:error', () => null)`. Expone `tasks`, `loading`, `error`, y `refresh()` que llama `await invoke('api_request', { req: { method: 'GET', path: '/tasks', body: null } })` y actualiza el state. Sin polling.

## 2. TaskCard rewrite

- [x] 2.1 Reescribir `app/components/dashboard/TaskCard.vue`: eliminado el `Task` interface y `TaskStatus` type locales. Ahora importa `import type { Task } from '~/types/task'`.
- [x] 2.2 Cuatro ramas de renderizado: pending (glass-card + chip Pendiente + budget display), paused (bg-tertiary-container/10 + chip Pausada + elapsed congelado + progress %), completed (opacity-60 + line-through + "Completada HH:MM"), placeholder (dashed border + Plus + "AÑADIR TAREA RÁPIDA"). Quinta rama defensiva para active (no debería llegar via grid).
- [x] 2.3 Patrón glass-card preservado, hover states, drag handle GripVertical, tokens semánticos (no hex hardcodeados). Helpers: `formatHM`, `formatClock`, `progressPercent` para consistencia.

## 3. TaskGrid rewrite

- [x] 3.1 Reescribir `app/components/dashboard/TaskGrid.vue`: eliminar el array hardcoded de tasks. Importar `useTaskList` y leer `tasks`, `loading`, `error`, `refresh`. Llamar `refresh()` en `onMounted`.
- [x] 3.2 Renderizar el header con título "Tareas de Hoy", contador "N Pendientes" (donde N = count de tasks con `status='pending'`), y botón "Ver histórico" (placeholder link, futuro change).
- [x] 3.3 Renderizar el grid de cards: una `TaskCard` por cada task en `tasks` (en el orden recibido), más la card placeholder al final SOLO si `tasks.length > 0`. Cada `TaskCard` recibe `:task="task"` y `:key="task.id"`.
- [x] 3.4 Implementar empty state: si `tasks.length === 0`, ocultar el grid y mostrar un bloque grande con copy motivacional y CTA "Crear tu primera tarea" que navega a `/tasks/new`. NO mostrar la card placeholder en este caso.
- [x] 3.5 Implementar loading state: si `loading === true` y `tasks.length === 0`, mostrar skeleton (3 placeholders con `animate-pulse`) o copy "Cargando tareas...".
- [x] 3.6 Implementar error state: si `error !== null`, mostrar mensaje inline discreto (no rompe el grid).

## 4. Ocultar activa del grid

- [x] 4.1 En `TaskGrid.vue`, agregar un computed `visibleTasks = tasks.filter(t => t.status !== 'active')` que excluye la activa. El render usa `visibleTasks` en lugar de `tasks`.
- [x] 4.2 Actualizar el contador "N Pendientes" para usar `visibleTasks` también.

## 5. Refresh hooks

- [x] 5.1 En `app/components/tasks/TaskForm.vue`, importar `useTaskList` y llamar `await useTaskList().refresh()` después de un `POST /tasks` exitoso (antes de cerrar el modal de éxito).
- [x] 5.2 En `app/components/dashboard/ActiveTimerSection.vue`, importar `useTaskList` y llamar `await useTaskList().refresh()` después de un `PATCH /tasks/:id` con `completed_at` exitoso (en la función `complete()`).
- [x] 5.3 NO llamar refresh después de pause/resume (no afecta el grid porque la activa está oculta).

## 6. Build y verificación

- [x] 6.1 Correr `pnpm nuxt generate` y verificar que el build pasa sin errores de TypeScript.
- [x] 6.2 Verificar visualmente con `design-verify` skill: `TaskCard` mantiene tokens semánticos, `TaskGrid` empty state vs. populated state se ven correctos, la card placeholder "AÑADIR TAREA RÁPIDA" preserva el estilo Stitch.
- [x] 6.3 Manual E2E (requiere `pnpm tauri dev` corriendo): crear tasks vía `/tasks/new`, verificar que aparecen en el grid, pausar/reanudar/completar desde `ActiveTimerSection`, verificar que el grid refleja los cambios después de completar.

## 7. Archive

- [x] 7.1 Correr `openspec archive add-task-list-view -y` para sincronizar las specs y mover el change a `archive/`.