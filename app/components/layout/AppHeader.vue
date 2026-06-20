<script setup lang="ts">
import { ref } from 'vue';
import { PanelLeftOpen, Bell, CircleUser } from '@lucide/vue';
import { Switch } from '@/components/ui/switch';

defineProps<{
  title?: string;
}>();

const pomodoroEnabled = ref(false);
</script>

<template>
  <header class="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant/10 bg-background/80 px-8 backdrop-blur-xl">
    <div class="flex items-center gap-3">
      <PanelLeftOpen class="size-5 cursor-pointer text-primary" />
      <h2 class="font-heading text-2xl font-bold text-primary">
        {{ title ?? 'Dashboard' }}
      </h2>
    </div>

    <div class="flex items-center gap-8">
      <div class="flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low px-4 py-1.5">
        <span class="font-label-mono text-xs uppercase tracking-widest text-muted-foreground">
          Pomodoro
        </span>
        <Switch v-model="pomodoroEnabled" class="scale-75" />
        <span class="font-label-mono text-xs font-bold text-primary">25/5</span>
      </div>

      <div class="flex items-center gap-3 text-muted-foreground">
        <button type="button" class="relative transition-colors hover:text-primary">
          <Bell class="size-5" />
          <span class="absolute right-0 top-0 size-2 rounded-full bg-tertiary" />
        </button>
        <button type="button" class="transition-colors hover:text-primary">
          <CircleUser class="size-5" />
        </button>
      </div>
    </div>
  </header>
</template>
