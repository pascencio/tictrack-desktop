<script setup lang="ts">
import { computed, ref } from 'vue';
import { Play, Save, AlertTriangle } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import TimeBudgetSlider from '@/components/tasks/TimeBudgetSlider.vue';
import TagInput from '@/components/tasks/TagInput.vue';
import SuccessModal from '@/components/tasks/SuccessModal.vue';
import type { CreateTaskRequest, Task } from '~/types/task';

const api = useApi();
const { session: activeSession, refresh: refreshActiveSession } = useActiveSession();

// Form state
const title = ref('');
const description = ref('');
const budgetMinutes = ref(90);
const tags = ref<string[]>([]);

// Submission state
const pending = ref(false);
const errorMessage = ref<string | null>(null);
const successDialogOpen = ref(false);
const lastCreatedTask = ref<Task | null>(null);

const formattedBudget = computed(() => {
  const h = Math.floor(budgetMinutes.value / 60);
  const m = budgetMinutes.value % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
});

const isValid = computed(() => title.value.trim().length > 0);
const hasActiveSession = computed(() => activeSession.value !== null);

// When an active session exists, the only path to start_immediately=true
// is via "Detenerla y empezar esta". The primary submit button is gated.
const startSubmitDisabled = computed(
  () => !isValid.value || pending.value || hasActiveSession.value,
);

function resetForm() {
  title.value = '';
  description.value = '';
  budgetMinutes.value = 90;
  tags.value = [];
  errorMessage.value = null;
}

function describeError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'kind' in err) {
    const apiErr = err as { kind: string; message: string };
    switch (apiErr.kind) {
      case 'HttpError':
        return `Error del backend: ${apiErr.message}`;
      case 'ConnectionError':
        return `No se pudo conectar con el backend: ${apiErr.message}`;
      case 'SerializationError':
        return `Respuesta inválida del backend: ${apiErr.message}`;
      case 'BackendNotConfigured':
        return 'Backend no configurado. Define TICTRACK_BACKEND_URL antes de continuar.';
      default:
        return apiErr.message;
    }
  }
  if (err instanceof Error) return err.message;
  return 'Error desconocido';
}

async function submit(intent: 'start' | 'save') {
  if (!isValid.value || pending.value) return;
  if (intent === 'start' && hasActiveSession.value) {
    errorMessage.value =
      'Ya hay una sesión activa. Usá "Detenerla y empezar esta" para reemplazarla.';
    return;
  }

  pending.value = true;
  errorMessage.value = null;

  const payload: CreateTaskRequest = {
    title: title.value.trim(),
    description: description.value.trim() || null,
    budget_minutes: budgetMinutes.value,
    tags: [...tags.value],
    start_immediately: intent === 'start',
  };

  try {
    const created = await api.post<Task>('/tasks', payload);
    lastCreatedTask.value = created;
    successDialogOpen.value = true;
    if (intent === 'start') {
      resetForm();
      // Backend now has a new active session — sync the shared state so
      // the dashboard's ActiveTimerSection picks it up immediately.
      await refreshActiveSession();
    }
  } catch (err) {
    errorMessage.value = describeError(err);
  } finally {
    pending.value = false;
  }
}

async function stopActiveAndStart() {
  const s = activeSession.value;
  if (!s || !isValid.value || pending.value) return;

  pending.value = true;
  errorMessage.value = null;

  try {
    await api.patch<Task>(`/tasks/${s.id}`, {
      completed_at: new Date().toISOString(),
    });
    // The active session is now closed. Fall through to the normal
    // submit flow with start_immediately=true, which will create the
    // new active session via the backend's auto-complete-on-POST path.
    await submit('start');
  } catch (err) {
    errorMessage.value = describeError(err);
    pending.value = false;
  }
}

function onCreateAnother() {
  resetForm();
}

function onGoToDashboard() {
  navigateTo('/');
}
</script>

<template>
  <form class="space-y-8" @submit.prevent="submit('start')">
    <!-- Active-session warning -->
    <div
      v-if="hasActiveSession"
      role="alert"
      class="flex flex-col gap-3 rounded-xl border border-tertiary/30 bg-tertiary-container/20 p-4 text-tertiary md:flex-row md:items-center md:justify-between"
    >
      <div class="flex items-start gap-3">
        <AlertTriangle class="size-5 shrink-0" />
        <div>
          <p class="font-bold">Ya tenés una sesión activa</p>
          <p class="text-sm opacity-90">
            "{{ activeSession?.title }}" — se completará al iniciar la nueva.
          </p>
        </div>
      </div>
      <Button
        type="button"
        :disabled="!isValid || pending"
        class="shrink-0 rounded-xl bg-tertiary-container px-5 py-3 font-bold text-tertiary shadow-lg shadow-tertiary/20 hover:brightness-110 active:scale-[0.98]"
        @click="stopActiveAndStart"
      >
        Detenerla y empezar esta
      </Button>
    </div>

    <!-- Title -->
    <div class="space-y-2">
      <label
        for="taskTitle"
        class="block px-1 font-medium uppercase tracking-wider text-muted-foreground text-body-sm"
      >
        Título del proyecto o tarea
      </label>
      <input
        id="taskTitle"
        v-model="title"
        type="text"
        placeholder="¿En qué vas a trabajar hoy?"
        autocomplete="off"
        class="w-full border-0 border-b-2 bg-transparent px-1 py-6 font-heading text-foreground transition-all placeholder:text-muted-foreground/40 focus:outline-none border-b-outline-variant focus:border-b-primary"
        style="border-bottom-color: rgba(144, 143, 160, 0.6)"
      />
    </div>

    <!-- Description -->
    <div class="space-y-2">
      <label
        for="taskDesc"
        class="block px-1 font-medium uppercase tracking-wider text-muted-foreground text-body-sm"
      >
        Detalles (opcional)
      </label>
      <textarea
        id="taskDesc"
        v-model="description"
        rows="2"
        placeholder="Describe brevemente los objetivos de esta sesión..."
        class="w-full resize-none border-0 border-b-2 bg-transparent px-1 py-4 font-body-md text-foreground transition-all placeholder:text-muted-foreground/40 focus:outline-none border-b-outline-variant focus:border-b-primary"
        style="border-bottom-color: rgba(144, 143, 160, 0.6)"
      />
    </div>

    <!-- Budget & Tags Bento -->
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
      <TimeBudgetSlider v-model="budgetMinutes" />
      <TagInput v-model="tags" />
    </div>

    <!-- Error -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Actions -->
    <div class="flex flex-col items-center gap-4 pt-6 md:flex-row">
      <Button
        type="submit"
        :disabled="startSubmitDisabled"
        class="w-full flex-1 gap-3 rounded-xl bg-primary px-8 py-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] md:w-auto"
      >
        <Play class="size-4" />
        Crear e iniciar timer
      </Button>
      <Button
        type="button"
        :disabled="!isValid || pending"
        variant="outline"
        class="w-full rounded-xl border border-outline-variant/50 px-8 py-6 font-medium text-muted-foreground hover:bg-surface-variant/30 hover:text-foreground active:scale-[0.98] md:w-auto"
        @click="submit('save')"
      >
        <Save class="mr-2 size-4" />
        Solo guardar
      </Button>
    </div>
  </form>

  <SuccessModal
    v-model:open="successDialogOpen"
    :task-title="lastCreatedTask?.title ?? title"
    @create-another="onCreateAnother"
    @go-to-dashboard="onGoToDashboard"
  />
</template>