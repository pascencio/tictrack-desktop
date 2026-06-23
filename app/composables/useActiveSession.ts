/**
 * Reactive accessor for the currently-active timer session.
 *
 * Wraps `GET /sessions/active`. The backend returns the single Task whose
 * `status` is `'active'` or `'paused'`, or `204 No Content` when there is
 * none. The composable polls every 60s to correct client clock drift
 * without overloading the backend; the per-second display tick lives in
 * the component (`ActiveTimerSection.vue`) and is purely local.
 *
 * State is shared across components via `useState` so the dashboard timer
 * and the `/tasks/new` banner see the same source of truth.
 */

import type { Task } from '~/types/task';
import { invoke } from '@tauri-apps/api/core';

const REFRESH_INTERVAL_MS = 60_000;

interface ApiInvokeResponse<T> {
  status: number;
  body: T;
}

export function useActiveSession() {
  const session = useState<Task | null>('tictrack:active-session', () => null);
  const loading = useState<boolean>('tictrack:active-session:loading', () => false);
  const error = useState<string | null>('tictrack:active-session:error', () => null);
  const lastFetchedAt = useState<number | null>('tictrack:active-session:last-fetched-at', () => null);

  let pollHandle: ReturnType<typeof setInterval> | null = null;

  async function refresh(): Promise<Task | null> {
    if (loading.value) return session.value;
    loading.value = true;
    error.value = null;
    try {
      const res = await invoke<ApiInvokeResponse<Task | null>>('api_request', {
        req: { method: 'GET', path: '/sessions/active', body: null },
      });
      // Rust surfaces HTTP 204 as `{ status: 204, body: null }` — the empty
      // body is parsed as JSON null. status check is defensive in case the
      // backend ever changes the encoding.
      session.value = res.status === 204 ? null : res.body ?? null;
      lastFetchedAt.value = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error.value = message;
    } finally {
      loading.value = false;
    }
    return session.value;
  }

  function startPolling() {
    if (pollHandle || typeof window === 'undefined') return;
    pollHandle = setInterval(refresh, REFRESH_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  }

  return {
    session: readonly(session),
    loading: readonly(loading),
    error: readonly(error),
    lastFetchedAt: readonly(lastFetchedAt),
    refresh,
    startPolling,
    stopPolling,
  };
}