## ADDED Requirements

### Requirement: GET /tasks lista todas las tareas

El sistema SHALL exponer `GET {TICTRACK_BACKEND_URL}/tasks` para listar todas las tasks persistidas en el backend. El backend SHALL responder `200 OK` con un array JSON de `Task[]` (independientemente del `status` de cada task). Si no hay tasks, SHALL responder `200 OK` con `[]`.

Este endpoint SHALL ser consumido por:

- El composable `useTaskList` del frontend (ver `specs/task-list/spec.md`) para hidratar la grilla del dashboard.
- Futuras vistas de listado o histórico.

El frontend SHALL invocar este endpoint vía `useApi().get<Task[]>('/tasks')` desde el composable `useTaskList`, que SHALL proxy la llamada a través del comando Rust `api_request` existente (sin nuevos comandos Tauri necesarios).

#### Scenario: Backend retorna tasks de todos los status

- **WHEN** el backend tiene tasks con `status='pending'`, `status='paused'`, `status='active'`, y `status='completed'`
- **AND** el frontend envía `GET /tasks`
- **THEN** el response SHALL contener un array con todas las tasks, independientemente de su `status`

#### Scenario: Backend vacío

- **WHEN** el backend no tiene tasks persistidas
- **AND** el frontend envía `GET /tasks`
- **THEN** el response SHALL ser `200 OK` con body `[]`

#### Scenario: Tareas preservan todos sus campos

- **WHEN** el backend retorna el array de tasks
- **THEN** cada task SHALL incluir `id`, `title`, `description`, `budget_minutes`, `tags`, `status`, `started_at`, `paused_at`, `completed_at`, `accumulated_paused_ms`, `created_at`, `updated_at`

#### Scenario: Orden de retorno

- **WHEN** el backend tiene N tasks
- **THEN** SHALL retornarlas en el orden de inserción del backend (orden cronológico de creación)
- **THEN** el frontend NO reordena client-side (lo muestra en el orden recibido)