<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ArrowRight } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import TaskCard from '@/components/dashboard/TaskCard.vue';
import { Sparkles } from '@lucide/vue';

const { tasks, loading, error, refresh } = useTaskList();

onMounted(() => {
  refresh();
});

const visibleTasks = computed(() => tasks.value.filter((t) => t.status !== 'active'));
const pendingCount = computed(() => visibleTasks.value.filter((t) => t.status === 'pending').length);
const isEmpty = computed(() => visibleTasks.value.length === 0);
const showGrid = computed(() => !isEmpty.value);
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h3 class="font-heading text-2xl font-semibold text-foreground">
          Tareas de Hoy
        </h3>
        <Badge class="rounded-full bg-surface-container-high px-4 py-1 text-xs font-bold text-primary">
          {{ pendingCount }} Pendientes
        </Badge>
      </div>
      <button
        type="button"
        disabled
        class="flex items-center gap-1 text-sm font-bold text-primary opacity-60"
        title="Próximamente"
      >
        Ver histórico
        <ArrowRight class="size-4" />
      </button>
    </div>

    <!-- Error inline (no rompe el grid) -->
    <div
      v-if="error"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      No se pudieron cargar las tareas: {{ error }}
    </div>

    <!-- Empty state (no hay tasks no-activas) -->
    <div
      v-if="showGrid === false && !loading"
      class="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container/30 p-12 text-center"
    >
      <div class="flex size-16 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container">
        <Sparkles class="size-8 text-muted-foreground" />
      </div>
      <div class="space-y-2">
        <h4 class="font-heading text-xl font-bold text-foreground">No hay tareas todavía</h4>
        <p class="text-muted-foreground">Empezá creando tu primera tarea.</p>
      </div>
      <NuxtLink
        to="/tasks/new"
        class="rounded-xl bg-primary-container px-6 py-3 font-bold text-on-primary-container shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
      >
        Crear tu primera tarea
      </NuxtLink>
    </div>

    <!-- Loading skeleton -->
    <div
      v-else-if="loading && tasks.length === 0"
      class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="h-48 animate-pulse rounded-2xl border border-outline-variant/10 bg-surface-container/50"
      />
    </div>

    <!-- Populated grid -->
    <div
      v-else
      class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      <TaskCard
        v-for="task in visibleTasks"
        :key="task.id"
        :task="task"
      />
      <!-- Placeholder card as the LAST item in the grid -->
      <div
        class="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-outline-variant/30 p-8 text-muted-foreground transition-colors hover:bg-surface-variant/10"
        @click="navigateTo('/tasks/new')"
      >
        <div class="flex size-12 items-center justify-center rounded-full border-2 border-outline-variant transition-transform group-hover:scale-110">
          <Sparkles class="size-8" />
        </div>
        <span class="text-sm font-bold uppercase tracking-widest">Añadir Tarea rápida</span>
      </div>
    </div>
  </section>
</template>