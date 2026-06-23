<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import TaskForm from '@/components/tasks/TaskForm.vue';
import { Info } from '@lucide/vue';

useHead({
  title: 'Nueva Tarea | TicTrack',
});

definePageMeta({
  layout: 'default',
});
</script>

<template>
  <div>
    <AppHeader title="Nueva Tarea" />

    <div class="mx-auto max-w-3xl space-y-8 p-8">
      <div class="glass-card rounded-2xl p-12 shadow-2xl">
        <TaskForm />
      </div>

      <div class="flex items-center justify-between px-3 text-muted-foreground">
        <div class="flex items-center gap-3 text-body-sm">
          <Info class="size-4" />
          <span>Los timers activos sincronizan automáticamente con Slack</span>
        </div>
        <div class="flex items-center gap-2 font-label-mono text-xs">
          <span class="rounded bg-surface-variant px-1.5 py-0.5 text-foreground">CMD + ENTER</span>
          <span>para crear</span>
        </div>
      </div>
    </div>
  </div>
</template>