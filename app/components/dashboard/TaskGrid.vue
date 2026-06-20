<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import TaskCard, { type Task } from '@/components/dashboard/TaskCard.vue';

const tasks: Task[] = [
  {
    id: 'CS-293',
    title: 'Revisión de Pull Requests',
    status: 'active',
    tags: [
      { label: 'Desarrollo' },
      { label: 'Alta Prioridad' },
    ],
    progress: { current: '1.5h', total: '2h', value: 75 },
  },
  {
    title: 'Documentación de Arquitectura',
    status: 'overtime',
    tags: [
      { label: 'Legal' },
      { label: 'Overtime', variant: 'destructive' },
    ],
    progress: { current: '4.2h', total: '3h', value: 100 },
    overtimeLabel: 'Presupuesto superado',
  },
  {
    title: 'Daily Standup',
    status: 'completed',
    tags: [{ label: 'Meeting' }],
    progress: { current: '15m', total: '15m', value: 100 },
    completedAt: '09:45 AM',
  },
  {
    title: '',
    status: 'add',
  },
];
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h3 class="font-heading text-2xl font-semibold text-foreground">
          Tareas de Hoy
        </h3>
        <Badge class="rounded-full bg-surface-container-high px-4 py-1 text-xs font-bold text-primary">
          4 Pendientes
        </Badge>
      </div>
      <button type="button" class="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        Ver histórico
        <ArrowRight class="size-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <TaskCard v-for="(task, index) in tasks" :key="index" :task="task" />
    </div>
  </section>
</template>
