<script setup lang="ts">
import { ref } from 'vue';
import { Search, X } from '@lucide/vue';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const currentInput = ref('');

function addTag() {
  const trimmed = currentInput.value.trim();
  if (!trimmed) return;

  const alreadyExists = props.modelValue.some(
    (t) => t.toLowerCase() === trimmed.toLowerCase(),
  );
  if (alreadyExists) {
    currentInput.value = '';
    return;
  }

  emit('update:modelValue', [...props.modelValue, trimmed]);
  currentInput.value = '';
}

function removeTag(index: number) {
  const next = props.modelValue.filter((_, i) => i !== index);
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="space-y-4 rounded-xl border border-outline-variant/10 bg-surface-container/50 p-6">
    <label class="text-body-sm font-medium text-muted-foreground">Etiquetas</label>

    <div class="relative">
      <input
        v-model="currentInput"
        type="text"
        placeholder="Añadir tag..."
        class="w-full border-0 border-b border-outline-variant/30 bg-transparent py-2 px-1 pr-6 font-body-3 text-foreground placeholder:text-muted-foreground/40 transition-all focus:border-primary focus:outline-none"
        @keydown.enter.prevent="addTag"
      />
      <Search class="pointer-events-none absolute right-0 top-1 size-4 text-muted-foreground" />
    </div>

    <div v-if="modelValue.length" class="flex flex-wrap gap-2">
      <span
        v-for="(tag, index) in modelValue"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 bg-surface-variant/50 px-3 py-1 text-sm text-foreground"
      >
        {{ tag }}
        <button
          type="button"
          aria-label="Remover tag"
          class="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-surface-variant hover:text-foreground"
          @click="removeTag(index)"
        >
          <X class="size-3" />
        </button>
      </span>
    </div>
  </div>
</template>