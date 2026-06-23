<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Task } from '~/types/task';

const props = defineProps<{
  open: boolean;
  taskTitle: string;
  /** Optional full Task reference; unused visually in this change but typed
   *  so future timer-sessions can extend this modal without refactoring. */
  task?: Task | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'createAnother'): void;
  (e: 'goToDashboard'): void;
}>();

function setOpen(value: boolean) {
  emit('update:open', value);
}

function onCreateAnother() {
  emit('createAnother');
  emit('update:open', false);
}

function onGoToDashboard() {
  emit('goToDashboard');
  emit('update:open', false);
}
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent class="border-outline-variant/20 bg-card text-foreground">
      <DialogHeader>
        <DialogTitle class="font-heading text-headline-4 text-foreground">Tarea creada</DialogTitle>
        <DialogDescription class="text-muted-foreground">
          Se creó &ldquo;{{ taskTitle }}&rdquo;.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-4">
        <Button
          type="button"
          variant="outline"
          class="rounded-xl border border-outline-variant/50 px-8 py-6 font-medium text-muted-foreground hover:bg-surface-variant/30 hover:text-foreground"
          @click="onCreateAnother"
        >
          Crear otra
        </Button>
        <Button
          type="button"
          class="rounded-xl bg-primary-container px-8 py-6 font-bold text-on-primary-container shadow-lg shadow-primary/20 hover:brightness-110"
          @click="onGoToDashboard"
        >
          Ir al dashboard
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>