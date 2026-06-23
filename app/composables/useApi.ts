/**
 * `$fetch`-like API surface that delegates to the Rust Tauri command
 * `api_request`. The frontend code reads as if it were a normal HTTP call,
 * but the actual request is executed by Rust against the BFF whose URL
 * is read from `TICTRACK_BACKEND_URL` at startup.
 *
 * The backend URL never reaches the JS bundle.
 */

import type { CreateTaskResponse, Task } from '~/types/task';
import { invoke } from '@tauri-apps/api/core';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiInvokeResponse<T> {
  status: number;
  body: T;
}

interface ApiInvokeError {
  kind: 'BackendNotConfigured' | 'HttpError' | 'ConnectionError' | 'SerializationError';
  message: string;
}

export interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
}

async function call<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const response = await invoke<ApiInvokeResponse<T>>('api_request', {
    req: {
      method,
      path,
      body: options.body ?? null,
    },
  });
  return response.body;
}

export function useApi() {
  return {
    get: <T>(path: string) => call<T>(path, { method: 'GET' }),
    post: <T>(path: string, body?: unknown) => call<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => call<T>(path, { method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown) => call<T>(path, { method: 'PATCH', body }),
    delete: <T>(path: string) => call<T>(path, { method: 'DELETE' }),
  };
}

/** Re-exports for convenience so feature modules import only from `useApi`. */
export type { Task, CreateTaskResponse, ApiInvokeError };