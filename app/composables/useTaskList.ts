/**
 * Reactive accessor for the full task list.
 *
 * Wraps `GET /tasks`. The backend returns the complete array of tasks
 * (any status). The composable filters the active session out at the
 * consumer (TaskGrid) so it does not duplicate with ActiveTimerSection.
 *
 * State is shared via `useState` so the grid and any future list views
 * see the same source of truth. Refresh is on-demand only — no polling.
 * Call `refresh()` after mutations that affect the list:
 *   - POST /tasks success (TaskForm)
 *   - PATCH /tasks/:id with completed_at success (ActiveTimerSection)
 */

import type { Task } from '~/types/task';
import { invoke } from '@tauri-apps/api/core';

interface ApiInvokeResponse<T> {
  status: number;
  body: T;
}

export function useTaskList() {
  const tasks = useState<Task[]>('tictrack:task-list', () => []);
  const loading = useState<boolean>('tictrack:task-list:loading', () => false);
  const error = useState<string | null>('tictrack:task-list:error', () => null);

  async function refresh(): Promise<Task[]> {
    if (loading.value) return tasks.value;
    loading.value = true;
    error.value = null;
    try {
      const res = await invoke<ApiInvokeResponse<Task[]>>('api_request', {
        req: { method: 'GET', path: '/tasks', body: null },
      });
      tasks.value = res.body ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
    return tasks.value;
  }

  return {
    tasks: readonly(tasks),
    loading: readonly(loading),
    error: readonly(error),
    refresh,
  };
}