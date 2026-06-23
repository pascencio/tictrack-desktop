<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { Timer, Pause, Play, CheckCircle, MoreHorizontal, Sparkles } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import type { Task } from '~/types/task';

const api = useApi();
const { session, refresh, startPolling, stopPolling } = useActiveSession();

const now = ref(Date.now());
useIntervalFn(() => {
  now.value = Date.now();
}, 1000, { immediate: true });

// Action pending flags disable buttons during in-flight PATCH.
const pendingAction = ref<null | 'pause' | 'resume' | 'complete'>(null);
const actionError = ref<string | null>(null);

// Re-fetch the active session whenever the dashboard mounts, and start
// the 60s drift-correcting poll. Stop the poll on unmount.
onMounted(() => {
  refresh();
  startPolling();
});
onUnmounted(() => {
  stopPolling();
});

const isActive = computed(() => session.value?.status === 'active');
const isPaused = computed(() => session.value?.status === 'paused');
const isEmpty = computed(() => !session.value);

const elapsedMs = computed(() => {
  const s = session.value;
  if (!s || !s.started_at) return 0;
  const startedAt = new Date(s.started_at).getTime();
  const accumulatedPaused = s.accumulated_paused_ms ?? 0;
  // For paused tasks, freeze the display at the moment of pause.
  const frozenAt = s.paused_at ? new Date(s.paused_at).getTime() : now.value;
  return Math.max(0, frozenAt - startedAt - accumulatedPaused);
});

const formattedElapsed = computed(() => {
  const totalSec = Math.floor(elapsedMs.value / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const progressFraction = computed(() => {
  const s = session.value;
  if (!s || !s.started_at || !s.budget_minutes) return 0;
  const totalMs = s.budget_minutes * 60_000;
  return Math.min(1, elapsedMs.value / totalMs);
});

// SVG ring circumference for r=88 is 2*π*88 ≈ 552.9. Offset moves the
// arc; smaller offset = more progress. 552.9 = empty, 0 = full.
const progressOffset = computed(() => 552.9 * (1 - progressFraction.value));

async function patchSession(body: { paused_at?: string; resumed_at?: string; completed_at?: string }) {
  const s = session.value;
  if (!s) return;
  const intent = (Object.keys(body)[0] ?? 'unknown') as 'paused_at' | 'resumed_at' | 'completed_at';
  pendingAction.value = intent === 'paused_at' ? 'pause' : intent === 'resumed_at' ? 'resume' : 'complete';
  actionError.value = null;
  try {
    await api.patch<Task>(`/tasks/${s.id}`, body);
    await refresh();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : String(err);
  } finally {
    pendingAction.value = null;
  }
}

function pause() {
  return patchSession({ paused_at: new Date().toISOString() });
}
function resume() {
  return patchSession({ resumed_at: new Date().toISOString() });
}
function complete() {
  return patchSession({ completed_at: new Date().toISOString() });
}
</script>

<template>
  <section class="glass-card relative flex flex-col items-center gap-8 overflow-hidden rounded-2xl p-8 md:flex-row">
    <div v-if="isActive" class="absolute left-0 top-0 h-1 w-full shimmer opacity-50" />

    <!-- Empty state -->
    <template v-if="isEmpty">
      <div class="flex w-full flex-col items-center gap-6 py-8 text-center">
        <div class="flex size-20 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container">
          <Sparkles class="size-9 text-muted-foreground" />
        </div>
        <div class="space-y-2">
          <h3 class="font-heading text-2xl font-semibold text-foreground">Sin sesión activa</h3>
          <p class="text-muted-foreground">
            Empezá una tarea para registrar tiempo.
          </p>
        </div>
        <NuxtLink
          to="/tasks/new"
          class="rounded-xl bg-primary-container px-6 py-3 font-bold text-on-primary-container shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          Iniciar una tarea
        </NuxtLink>
      </div>
    </template>

    <template v-else>
      <div class="relative flex size-48 items-center justify-center">
        <svg class="size-full -rotate-90" viewBox="0 0 192 192">
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="transparent"
            stroke="currentColor"
            stroke-width="8"
            class="text-surface-variant/30"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="transparent"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="552.9"
            :stroke-dashoffset="progressOffset"
            class="transition-[stroke-dashoffset] duration-300"
            :class="isPaused ? 'text-tertiary' : 'text-primary'"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <Timer class="size-8" :class="isPaused ? 'text-tertiary' : 'text-primary'" />
          <span
            class="font-label-mono mt-1 text-xs uppercase"
            :class="isPaused ? 'text-tertiary' : 'text-muted-foreground'"
          >
            {{ isPaused ? 'En pausa' : 'Sesión activa' }}
          </span>
        </div>
      </div>

      <div class="flex-1 text-center md:text-left">
        <h3 class="font-heading text-2xl font-semibold text-primary">
          {{ session?.title }}
        </h3>
        <p class="mb-6 text-muted-foreground">
          {{ session?.description || 'Proyecto sin descripción' }}
        </p>
        <div
          class="font-display-timer mb-6 tracking-tighter"
          :class="isActive ? 'timer-glow text-foreground' : 'text-tertiary'"
        >
          {{ formattedElapsed }}
        </div>

        <div
          v-if="actionError"
          role="alert"
          class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {{ actionError }}
        </div>

        <div class="flex flex-wrap justify-center gap-3 md:justify-start">
          <Button
            v-if="isActive"
            :disabled="pendingAction !== null"
            class="gap-2 rounded-xl px-8 py-6 font-bold"
            @click="pause"
          >
            <Pause class="size-4" />
            Pausa
          </Button>
          <Button
            v-if="isPaused"
            :disabled="pendingAction !== null"
            class="gap-2 rounded-xl bg-primary px-8 py-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110"
            @click="resume"
          >
            <Play class="size-4" />
            Reanudar
          </Button>
          <Button
            variant="outline"
            :disabled="pendingAction !== null"
            class="gap-2 rounded-xl px-8 py-6 font-bold"
            @click="complete"
          >
            <CheckCircle class="size-4" />
            Completar
          </Button>
          <Button variant="outline" size="icon" class="rounded-xl" disabled>
            <MoreHorizontal class="size-4" />
          </Button>
        </div>
      </div>

      <div class="hidden border-l border-outline-variant/20 pl-8 lg:grid lg:grid-cols-1 lg:gap-4">
        <div class="text-right">
          <p class="font-label-mono text-xs uppercase text-muted-foreground">Objetivo</p>
          <p class="text-lg font-bold text-foreground">
            {{ Math.floor((session?.budget_minutes ?? 0) / 60) }}h
            {{ String((session?.budget_minutes ?? 0) % 60).padStart(2, '0') }}m
          </p>
        </div>
        <div class="text-right">
          <p class="font-label-mono text-xs uppercase text-muted-foreground">Estado</p>
          <p
            class="text-lg font-bold"
            :class="isPaused ? 'text-tertiary' : 'text-primary'"
          >
            {{ isPaused ? 'Pausada' : 'Corriendo' }}
          </p>
        </div>
      </div>
    </template>
  </section>
</template>