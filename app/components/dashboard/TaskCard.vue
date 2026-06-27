<script setup lang="ts">
import { computed } from 'vue';
import { GripVertical, Pause, CheckCircle, Plus, AlertTriangle } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Task } from '~/types/task';

const props = defineProps<{
  task: Task;
}>();

// ─── Time helpers ────────────────────────────────────────────────────────────

function nowMs(): number {
  return Date.now();
}

function pausedElapsedMs(task: Task): number {
  if (!task.paused_at || !task.started_at) return 0;
  return Math.max(
    0,
    new Date(task.paused_at).getTime() -
      new Date(task.started_at).getTime() -
      (task.accumulated_paused_ms ?? 0),
  );
}

function completedElapsedMs(task: Task): number {
  if (!task.started_at || !task.completed_at) return 0;
  return Math.max(
    0,
    new Date(task.completed_at).getTime() -
      new Date(task.started_at).getTime() -
      (task.accumulated_paused_ms ?? 0),
  );
}

function formatHM(totalMs: number): string {
  const totalSec = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatClock(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function progressPercent(elapsedMs: number, budgetMinutes: number): number {
  if (!budgetMinutes) return 0;
  const totalMs = budgetMinutes * 60_000;
  return Math.min(100, (elapsedMs / totalMs) * 100);
}

// ─── Computeds ────────────────────────────────────────────────────────────────

const isPending = computed(() => props.task.status === 'pending');
const isPaused = computed(() => props.task.status === 'paused');
const isCompleted = computed(() => props.task.status === 'completed');
const isActive = computed(() => props.task.status === 'active'); // defensive: should never render via grid

const elapsedMs = computed(() => {
  if (isPaused.value) return pausedElapsedMs(props.task);
  if (isCompleted.value) return completedElapsedMs(props.task);
  // pending: 0; active: not used (defensive); frozen now() would be wrong since we hide active
  if (isActive.value) {
    const startedAt = new Date(props.task.started_at!).getTime();
    return Math.max(0, nowMs() - startedAt - (props.task.accumulated_paused_ms ?? 0));
  }
  return 0;
});

const progressPct = computed(() => progressPercent(elapsedMs.value, props.task.budget_minutes));
const isOvertime = computed(() => elapsedMs.value > props.task.budget_minutes * 60_000);
</script>

<template>
  <!-- Placeholder slot: rendered by TaskGrid as the last "card" when there are tasks -->
  <div
    v-if="task.status === ('__placeholder__' as Task['status'])"
    class="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-outline-variant/30 p-8 text-muted-foreground transition-colors hover:bg-surface-variant/10"
  >
    <div class="flex size-12 items-center justify-center rounded-full border-2 border-outline-variant transition-transform group-hover:scale-110">
      <Plus class="size-8" />
    </div>
    <span class="text-sm font-bold uppercase tracking-widest">Añadir Tarea rápida</span>
  </div>

  <!-- Pending -->
  <div
    v-else-if="isPending"
    class="glass-card group relative cursor-pointer rounded-2xl p-6 transition-all hover:border-primary/30"
  >
    <div class="mb-6 flex items-start justify-between">
      <div class="cursor-grab rounded-lg bg-surface-container p-1 text-muted-foreground active:cursor-grabbing">
        <GripVertical class="size-5" />
      </div>
      <Badge
        variant="outline"
        class="rounded-full bg-primary-container/20 px-3 py-1 text-[10px] font-bold uppercase text-primary"
      >
        Pendiente
      </Badge>
    </div>
    <h4 class="mb-1 font-heading text-lg font-bold text-foreground">
      {{ task.title }}
    </h4>
    <div v-if="task.tags.length" class="mb-6 flex flex-wrap gap-1">
      <Badge
        v-for="tag in task.tags"
        :key="tag"
        variant="outline"
        class="rounded-full border-secondary-container/20 bg-secondary-container/20 px-3 py-1 text-[10px] font-bold uppercase text-secondary"
      >
        {{ tag }}
      </Badge>
    </div>
    <div class="space-y-2">
      <div class="flex justify-between font-label-mono text-xs">
        <span class="text-muted-foreground">Presupuesto</span>
        <span class="text-foreground">{{ formatHM(task.budget_minutes * 60_000) }}</span>
      </div>
      <Progress :model-value="0" class="h-1.5 bg-surface-variant [&>div]:bg-primary" />
    </div>
  </div>

  <!-- Paused -->
  <div
    v-else-if="isPaused"
    class="glass-card group relative cursor-pointer rounded-2xl border border-tertiary/30 bg-tertiary-container/10 p-6 transition-all hover:border-tertiary/50"
  >
    <div class="mb-6 flex items-start justify-between">
      <div class="cursor-grab rounded-lg bg-surface-container p-1 text-muted-foreground active:cursor-grabbing">
        <GripVertical class="size-5" />
      </div>
      <Badge
        variant="outline"
        class="rounded-full bg-tertiary-container/30 px-3 py-1 text-[10px] font-bold uppercase text-tertiary"
      >
        <Pause class="mr-1 inline size-3" />
        Pausada
      </Badge>
    </div>
    <h4 class="mb-1 font-heading text-lg font-bold text-foreground">
      {{ task.title }}
    </h4>
    <div v-if="task.tags.length" class="mb-6 flex flex-wrap gap-1">
      <Badge
        v-for="tag in task.tags"
        :key="tag"
        variant="outline"
        class="rounded-full border-tertiary-container/20 bg-tertiary-container/20 px-3 py-1 text-[10px] font-bold uppercase text-tertiary"
      >
        {{ tag }}
      </Badge>
    </div>
    <div class="space-y-2">
      <div class="flex justify-between font-label-mono text-xs">
        <span class="text-muted-foreground">Tiempo registrado</span>
        <span class="font-bold text-tertiary">{{ formatHM(elapsedMs) }}</span>
      </div>
      <Progress
        :model-value="progressPct"
        class="h-1.5 bg-surface-variant [&>div]:bg-tertiary"
      />
    </div>
  </div>

  <!-- Completed -->
  <div
    v-else-if="isCompleted"
    class="glass-card rounded-2xl border border-dashed border-outline-variant/30 p-6 opacity-60 transition-all"
  >
    <div class="mb-6 flex items-start justify-between">
      <CheckCircle class="size-5 fill-primary text-primary" />
      <span class="font-label-mono text-xs text-muted-foreground">Completada</span>
    </div>
    <h4 class="mb-1 font-heading text-lg font-bold text-foreground line-through">
      {{ task.title }}
    </h4>
    <div v-if="task.tags.length" class="mb-6 flex flex-wrap gap-1">
      <Badge
        v-for="tag in task.tags"
        :key="tag"
        variant="secondary"
        class="rounded-full bg-surface-container-highest px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground"
      >
        {{ tag }}
      </Badge>
    </div>
    <div class="flex items-end justify-between">
      <span class="font-label-mono text-xs text-muted-foreground">
        Completada a las {{ formatClock(task.completed_at) }}
      </span>
      <span class="text-sm font-bold text-foreground">
        {{ formatHM(elapsedMs) }} / {{ formatHM(task.budget_minutes * 60_000) }}
      </span>
    </div>
  </div>

  <!-- Defensive: should not render via grid (active is hidden) -->
  <div
    v-else-if="isActive"
    class="glass-card rounded-2xl border border-primary/30 bg-primary-container/10 p-6"
  >
    <AlertTriangle class="mb-3 size-5 text-primary" />
    <p class="text-sm text-muted-foreground">
      Sesión activa: <span class="font-bold text-foreground">{{ task.title }}</span>.
      Visible en <span class="font-label-mono text-primary">ActiveTimerSection</span> arriba.
    </p>
  </div>
</template>