<script setup lang="ts">
import { GripVertical, AlertTriangle, CheckCircle, Plus, ArrowRight } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export type TaskStatus = 'active' | 'overtime' | 'completed' | 'add';

export interface Task {
  id?: string;
  title: string;
  tags?: { label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }[];
  progress?: { current: string; total: string; value: number };
  status: TaskStatus;
  completedAt?: string;
  overtimeLabel?: string;
}

defineProps<{
  task: Task;
}>();
</script>

<template>
  <div
    v-if="task.status === 'add'"
    class="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-outline-variant/30 p-8 text-muted-foreground transition-colors hover:bg-surface-variant/10"
  >
    <div class="flex size-12 items-center justify-center rounded-full border-2 border-outline-variant transition-transform group-hover:scale-110">
      <Plus class="size-8" />
    </div>
    <span class="text-sm font-bold uppercase tracking-widest">Añadir Tarea rápida</span>
  </div>

  <div
    v-else-if="task.status === 'overtime'"
    class="glass-card group relative cursor-pointer rounded-2xl border border-destructive/20 bg-destructive/5 p-6 transition-all hover:border-destructive/40"
  >
    <AlertTriangle class="absolute right-4 top-4 size-5 fill-destructive text-destructive" />
    <div class="mb-6 flex items-start justify-between">
      <div class="cursor-grab rounded-lg bg-surface-container p-1 text-muted-foreground active:cursor-grabbing">
        <GripVertical class="size-5" />
      </div>
    </div>
    <h4 class="mb-1 font-heading text-lg font-bold text-foreground">
      {{ task.title }}
    </h4>
    <div v-if="task.tags?.length" class="mb-6 flex flex-wrap gap-1">
      <Badge
        v-for="tag in task.tags"
        :key="tag.label"
        variant="outline"
        class="rounded-full text-[10px] font-bold uppercase"
        :class="tag.variant === 'destructive' ? 'border-destructive/20 bg-destructive/20 text-destructive' : 'border-tertiary-container/20 bg-tertiary-container/20 text-tertiary'"
      >
        {{ tag.label }}
      </Badge>
    </div>
    <div v-if="task.progress" class="space-y-2">
      <div class="flex justify-between font-label-mono text-xs">
        <span class="font-bold italic text-destructive">{{ task.overtimeLabel ?? 'Presupuesto superado' }}</span>
        <span class="font-bold text-destructive">{{ task.progress.current }} / {{ task.progress.total }}</span>
      </div>
      <Progress :model-value="task.progress.value" class="h-1.5 bg-surface-variant [&>div]:bg-destructive" />
    </div>
  </div>

  <div
    v-else-if="task.status === 'completed'"
    class="glass-card rounded-2xl border border-dashed border-outline-variant/30 p-6 opacity-60 transition-all"
  >
    <div class="mb-6 flex items-start justify-between">
      <CheckCircle class="size-5 fill-primary text-primary" />
      <span class="font-label-mono text-xs text-muted-foreground">Completada</span>
    </div>
    <h4 class="mb-1 font-heading text-lg font-bold text-foreground line-through">
      {{ task.title }}
    </h4>
    <div v-if="task.tags?.length" class="mb-6 flex flex-wrap gap-1">
      <Badge
        v-for="tag in task.tags"
        :key="tag.label"
        variant="secondary"
        class="rounded-full bg-surface-container-highest text-[10px] font-bold uppercase text-muted-foreground"
      >
        {{ tag.label }}
      </Badge>
    </div>
    <div class="flex items-end justify-between">
      <span v-if="task.completedAt" class="font-label-mono text-xs text-muted-foreground">
        Finalizado a las {{ task.completedAt }}
      </span>
      <span v-if="task.progress" class="text-sm font-bold text-foreground">
        {{ task.progress.current }} / {{ task.progress.total }}
      </span>
    </div>
  </div>

  <div
    v-else
    class="glass-card group relative cursor-pointer rounded-2xl p-6 transition-all hover:border-primary/30"
  >
    <div class="mb-6 flex items-start justify-between">
      <div class="cursor-grab rounded-lg bg-surface-container p-1 text-muted-foreground active:cursor-grabbing">
        <GripVertical class="size-5" />
      </div>
      <span v-if="task.id" class="font-label-mono text-xs text-muted-foreground">ID: {{ task.id }}</span>
    </div>
    <h4 class="mb-1 font-heading text-lg font-bold text-foreground transition-colors group-hover:text-primary">
      {{ task.title }}
    </h4>
    <div v-if="task.tags?.length" class="mb-6 flex flex-wrap gap-1">
      <Badge
        v-for="tag in task.tags"
        :key="tag.label"
        variant="outline"
        class="rounded-full text-[10px] font-bold uppercase"
        :class="tag.label === 'Alta Prioridad'
          ? 'bg-surface-container-highest text-muted-foreground'
          : 'border-secondary-container/20 bg-secondary-container/20 text-secondary'"
      >
        {{ tag.label }}
      </Badge>
    </div>
    <div v-if="task.progress" class="space-y-2">
      <div class="flex justify-between font-label-mono text-xs">
        <span class="text-muted-foreground">Progreso</span>
        <span class="text-foreground">{{ task.progress.current }} / {{ task.progress.total }}</span>
      </div>
      <Progress :model-value="task.progress.value" class="h-1.5 bg-surface-variant [&>div]:bg-primary" />
    </div>
  </div>
</template>
