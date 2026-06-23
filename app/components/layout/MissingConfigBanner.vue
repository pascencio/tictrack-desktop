<script setup lang="ts">
import { onMounted } from 'vue';
import { AlertTriangle } from '@lucide/vue';

const { status, check } = useBackendStatus();

onMounted(() => {
  check();
});
</script>

<template>
  <div
    v-if="!status.configured"
    role="alert"
    class="flex items-center gap-3 rounded-xl border border-tertiary/30 bg-tertiary-container/20 p-4 text-tertiary"
  >
    <AlertTriangle class="size-5 shrink-0" />
    <p class="text-sm font-medium">
      Configura <code class="rounded bg-surface-container px-1.5 py-0.5 font-label-mono text-xs">TICTRACK_BACKEND_URL</code> para habilitar la sincronización con el backend.
    </p>
  </div>
</template>