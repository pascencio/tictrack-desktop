<script setup lang="ts">
import { Zap } from '@lucide/vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import ActiveTimerSection from '@/components/dashboard/ActiveTimerSection.vue';
import TaskGrid from '@/components/dashboard/TaskGrid.vue';

definePageMeta({
  layout: 'default',
});
</script>

<template>
  <div>
    <AppHeader title="Dashboard" />

    <div class="mx-auto max-w-7xl space-y-8 p-8">
      <ActiveTimerSection />
      <TaskGrid />
    </div>

    <div class="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        class="group relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-90"
      >
        <Zap class="size-8" />
        <span class="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-outline-variant/20 bg-surface-container-highest px-4 py-1 text-xs text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          Quick Focus Mode (Ctrl + K)
        </span>
      </button>
    </div>
  </div>
</template>
