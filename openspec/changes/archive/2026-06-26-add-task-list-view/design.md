## Context

`add-new-task-view` y `add-timer-persistence` dejaron el backend como source of truth para el ciclo de vida de las tareas (creación, transiciones de estado, persistencia entre cierres). El dashboard, sin embargo, quedó en un estado mixto: `ActiveTimerSection.vue` consume `useActiveSession` correctamente, pero `TaskGrid.vue` mantiene cuatro cards hardcoded con un `Task` interface local que ignora completamente el modelo del backend.

El diseño Stitch "Dashboard Principal - TicTrack (Logo Final)" confirma la forma esperada de la grilla: tres cards de tareas reales + una card dashed "+ AÑADIR TAREA RÁPIDA" como CTA permanente a `/tasks/new`. El cambio cierra el loop entre backend y dashboard.

El mock `/home/patricio/json-server/server.js` ya expone `GET /tasks` desde `add-timer-persistence` y retorna el array completo de tasks. No se requieren cambios en el backend.

## Goals / Non-Goals

**Goals:**

- Reemplazar el array hardcoded de `TaskGrid.vue` por una vista derivada del backend vía `GET /tasks`.
- Ajustar `TaskCard.vue` para que entienda los cuatro status reales del backend (`pending` | `active` | `paused` | `completed`).
- Mantener la card dashed "+ AÑADIR TAREA RÁPIDA" del diseño Stitch como CTA permanente.
- Ocultar la sesión activa del grid (ya está en `ActiveTimerSection` arriba).
- Sincronizar el grid después de mutaciones vía refresh explícito desde `TaskForm` y `ActiveTimerSection`.

**Non-Goals:**

- Acciones desde el grid (start/resume/complete inline). Las acciones viven en `ActiveTimerSection` y `/tasks/new`.
- Paginación, ordenamiento configurable, o filtros por fecha. El usuario ve todas las tasks no-activas en orden de `created_at` descendente (default del array del backend).
- Polling automático. El grid es read-mostly; las mutaciones refrescan explícitamente.
- Migración del `Task` interface local de `TaskCard.vue` a un sistema de versiones. Simplemente se elimina (era redundante con `app/types/task.ts`).
- Filtros por tag, status, o fecha en el backend. `GET /tasks` retorna todo; el frontend filtra la sesión activa.

## Decisions

### 1. Composable `useTaskList` separado de `useActiveSession`

**Decisión**: nuevo composable independiente, no fusionado con `useActiveSession`.

**Por qué**: cohesión. `useActiveSession` es single-responsibility (la activa). `useTaskList` es la lista completa. Si los fusionamos, las llamadas de refetch se disparan en momentos no relacionados (polling de la activa vs. después de completar). Separarlos mantiene cada uno simple.

**Alternativas consideradas**:

- **Fusionar**: el polling de la activa refetchea el grid. Con 60s de polling y refetch manual cada vez que el grid cambia, el backend recibe más tráfico del necesario.
- **Pinia store de tasks**: introduce una dependencia nueva. Los `useState` de Nuxt ya cubren el caso shared-state.

### 2. Refresh explícito on-demand, sin polling

**Decisión**: el grid se refresca explícitamente después de mutaciones. No hay `setInterval`.

**Por qué**: el grid es read-mostly. La única fuente de cambios es el usuario mismo (crea, pausa, completa). Polling sería desperdicio. Refresh on-demand dispara justo después de `TaskForm.submit()` success y `ActiveTimerSection.complete()` success — los dos puntos donde el grid puede quedar stale.

**Alternativas consideradas**:

- **Polling cada 30s/60s como `useActiveSession`**: data sin cambios se descarga igual. Desperdicia backend.
- **WebSocket / SSE**: infraestructura nueva para un caso de uso read-mostly. Sobre-ingeniería.

### 3. Filtro del lado frontend (ocultar activa)

**Decisión**: el frontend excluye la task con `status='active'` del render. La activa está duplicada en `ActiveTimerSection`.

**Por qué**: redundancia visual. El usuario ya ve la activa con timer real arriba.

**Alternativas consideradas**:

- **Backend devuelve solo no-activas**: requiere un nuevo endpoint `GET /tasks?exclude_status=active`. Más complejo; mismo resultado.
- **Mostrar activa como card con link al timer**: duplica info y agrega confusión ("¿cuál es la real?").

### 4. `TaskCard.vue` consume el `Task` global, no el local

**Decisión**: el type `Task` interface local de `TaskCard.vue` se elimina. El componente consume `import type { Task } from '~/types/task'`.

**Por qué**: el type local tenía cuatro status (`active` | `overtime` | `completed` | `add`) que no coinciden con el modelo del backend. Tener dos definitions de la misma entidad es fuente de bugs.

**Alternativas consideradas**:

- **Mantener el local y hacer adapt**: agrega una capa de mapping innecesaria. La fuente de verdad debe ser una sola.

### 5. Cuatro ramas de renderizado + card placeholder

**Decisión**:

| Status backend | Rama en `TaskCard.vue` | Visual |
|---|---|---|
| `pending` | `<TaskCardPending>` | glass-card normal, chip "Pendiente" en primary, progress bar 0%, tags, footer con budget formateado |
| `paused` | `<TaskCardPaused>` | glass-card con `bg-tertiary-container/10` border tertiary, chip "Pausada" en tertiary, elapsed congelado, progress al % actual |
| `completed` | `<TaskCardCompleted>` | glass-card opaca (opacity 60%), border dashed, title line-through, "Completada HH:MM", elapsed total |
| placeholder | `<TaskCardAdd>` | card dashed border, icono `Plus`, label "AÑADIR TAREA RÁPIDA" (preserva diseño Stitch) |

**Por qué**: el modelo de cuatro estados del backend (`pending` | `active` | `paused` | `completed`) más la card placeholder del Stitch da cinco ramas en total. Cada una con estilos distintos siguiendo tokens del design-system.

**Alternativas consideradas**:

- **Tres ramas + un componente wrapper**: over-abstracción. Cada status es visualmente distinto; mejor inline.
- **Computed `styleClass` por status**: dynamic classes se vuelven ilegibles con cinco status.

### 6. Orden de renderizado: `created_at` descendente

**Decisión**: el grid renderiza en el orden que llega del backend (actualmente el orden de inserción en `db.json`). Sin reordenamiento client-side.

**Por qué**: el usuario lee de arriba a abajo esperando "más reciente arriba". El mock retorna el array en orden de inserción (más nuevo al final). Para V1 lo dejamos así; si la necesidad cambia, el backend puede ordenar por `started_at` o `created_at` sin tocar el frontend.

**Alternativas consideradas**:

- **Sort client-side por `updated_at`**: requiere lógica adicional. El backend puede hacer esto trivialmente cuando lo necesite.
- **Drag-to-reorder**: scope creep; futuro change.

## Risks / Trade-offs

- **Sin batching**: cada refresh de `useTaskList` es una request HTTP separada. Si el usuario tiene 1000 tasks, cada refresh tarda lo que tarde el backend en serializar 1000 tasks. **Mitigation**: el backend puede agregar paginación/filtering cuando sea necesario (futuro change). V1 no tiene usuarios con 1000 tasks.

- **Refresh hook manual**: si en el futuro se agrega una nueva superficie que mute tasks (ej. un shortcut de teclado para "completar activa"), hay que acordarse de llamar `useTaskList.refresh()`. **Mitigation**: documento en `design.md` la regla "toda mutación que afecta el grid debe llamar refresh"; futuro change podría refactorizar a un store centralizado.

- **Tipo local eliminado puede romper imports externos**: nadie importa `TaskCard.vue` desde otro componente hoy, pero si alguien lo hace, el cambio de tipo requiere migración. **Mitigation**: `grep` confirmó que el único consumidor de `TaskCard` es `TaskGrid`; cambio es local.

- **`GET /tasks` retorna TODAS las tasks incluyendo completed históricos**: en V1 esto está bien (workspaces pequeños). Cuando un usuario acumule cientos de completadas, la grilla se vuelve densa. **Mitigation**: el header podría mostrar un contador y un filtro "ver histórico" (futuro change); el backend puede agregar paginación.

## Migration Plan

No aplica — la grilla es read-only y se reemplaza enteramente. No hay state a migrar.

Para correr:
```bash
# Mock (ya está corriendo de la sesión anterior en tmux: tictrack-mock :8080)
# Si no: cd /home/patricio/json-server && node server.js

# App:
cd /home/patricio/personal/github/tictrack-desktop
TICTRACK_BACKEND_URL=http://localhost:8080 pnpm tauri dev
```

Verificación end-to-end:
1. Sin tasks en db.json → grid muestra empty state con CTA grande.
2. Crear dos tasks (una con "Crear e iniciar", otra con "Solo guardar") vía `/tasks/new` → grid muestra ambas. La activa NO aparece en el grid.
3. La activa aparece en `ActiveTimerSection` arriba. Pausarla → backend registra `paused_at` → grid actualiza tras refetch (próximo cambio explícito o recarga de página). Completarla → backend marca `status='completed'` → grid la muestra con estilo completado.
4. Cerrar app, reabrir → grid persiste estado (backend es source of truth).

## Design system compliance

### Tokens usados

| Token | Uso |
|---|---|
| `--background` | Fondo de la app |
| `--surface-container-low` | Sidebar, header sticky |
| `--surface-container` | Card del grid (`glass-card`) |
| `--surface-container-high` | Chips, fondo de hover |
| `--primary` | Acento primary, "Pendiente" chip |
| `--primary-container` | Botón CTA (futuro) |
| `--tertiary` | Estado `paused` (chip + border de card) |
| `--tertiary-container` | Fondo de card paused (`bg-tertiary-container/10`) |
| `--foreground` | Título de task, texto principal |
| `--muted-foreground` | Labels, hints, ID de task |
| `--outline-variant` | Borders sutiles, card placeholder dashed |
| `--secondary` | Acento de tags secundarias |
| `--destructive` | (Reservado para futuro overtime en grid, no se usa en V1) |

### Tipografía

| Elemento | Fuente | Clase |
|---|---|---|
| Título de task | Montserrat | `font-heading text-lg font-bold` |
| ID de task | JetBrains Mono | `font-label-mono text-xs` |
| Status chip | Inter | `text-[10px] font-bold uppercase` |
| Elapsed time | JetBrains Mono | `font-label-mono` |
| Labels de sección | Inter | `text-body-sm font-medium uppercase` |
| Progress label | JetBrains Mono | `font-label-mono text-xs` |

### Patrones de componentes

- **Card genérica**: `<div class="glass-card group relative rounded-2xl p-6 transition-all hover:border-primary/30">` (preserva el patrón existente).
- **Card paused**: agregar `border-tertiary/30 bg-tertiary-container/10`.
- **Card completed**: agregar `opacity-60 border-dashed border-outline-variant/30`.
- **Card placeholder**: `<div class="border-2 border-dashed border-outline-variant/30 p-8">` (preserva el estilo Stitch).
- **Status chips**: `rounded-full text-[10px] font-bold uppercase` con color de fondo según status (`bg-primary-container/20`, `bg-tertiary-container/20`, `bg-surface-container-highest`).
- **Progress bar**: `<Progress :model-value="value" class="h-1.5 bg-surface-variant [&>div]:bg-primary" />` (preserva patrón).
- **Botón placeholder**: `<button>` con `border-2 border-dashed` y `transition-transform group-hover:scale-110` (preserva Stitch).

### Iconos Lucide

| Uso | Icono |
|---|---|
| Drag handle | `GripVertical` |
| Paused indicator | `Pause` |
| Completed check | `CheckCircle` |
| Plus (placeholder) | `Plus` |
| ArrowRight (header "Ver histórico") | `ArrowRight` |
| Overtime (reservado) | `AlertTriangle` |

### Anti-patrones evitados

- Cero hex hardcodeados en `.vue` — todo via tokens semánticos.
- Iconos Lucide exclusivamente.
- Dark-first — clase `dark` ya en `<html>`.
- Sin sombras negras fuertes — glass-card + glow tokens.

## Open Questions

Ninguna pendiente. Decisiones tomadas con recomendación explícita:

1. ✅ Composable separado de `useActiveSession`.
2. ✅ Refresh on-demand sin polling.
3. ✅ Filtro del lado frontend.
4. ✅ `TaskCard` consume type global.
5. ✅ Cinco ramas de renderizado (4 status + placeholder).
6. ✅ Orden = orden de inserción del backend.