/**
 * Domain types for the `tasks` capability.
 *
 * The Task model is forward-compatible with the future `timer-sessions`
 * capability: the `status` field, `started_at`, `paused_at`, `completed_at`
 * and `accumulated_paused_ms` allow timer state to live entirely on the
 * backend while the desktop app reads and displays elapsed time without
 * local persistence.
 *
 * In this change (`add-new-task-view`), these fields are populated by the
 * backend in the response of `POST /tasks` and are NOT rendered in the UI.
 */

export type TaskStatus = 'pending' | 'active' | 'paused' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  budget_minutes: number;
  tags: string[];
  status: TaskStatus;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  accumulated_paused_ms: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string | null;
  budget_minutes: number;
  tags: string[];
  start_immediately: boolean;
}

export type CreateTaskResponse = Task;