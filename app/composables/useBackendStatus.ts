/**
 * Tracks whether the BFF URL is configured on the Rust side.
 *
 * The state is shared across components via Nuxt's `useState` so the
 * `<MissingConfigBanner />` and any future "Re-check config" button share
 * the same source of truth. The actual check goes through Tauri command
 * `get_backend_url` (returns `BackendNotConfigured` error if unset).
 */

import { invoke } from '@tauri-apps/api/core';

export interface BackendStatus {
  configured: boolean;
  url?: string;
}

export function useBackendStatus() {
  const status = useState<BackendStatus>('tictrack:backend-status', () => ({
    configured: false,
  }));

  const checking = useState<boolean>('tictrack:backend-status:checking', () => false);

  async function check(force = false): Promise<BackendStatus> {
    if (checking.value) return status.value;
    if (status.value.configured && !force) return status.value;

    checking.value = true;
    try {
      const url = await invoke<string>('get_backend_url');
      status.value = { configured: true, url };
    } catch {
      status.value = { configured: false };
    } finally {
      checking.value = false;
    }
    return status.value;
  }

  return {
    status: readonly(status),
    checking: readonly(checking),
    check,
  };
}