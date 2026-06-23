<script setup lang="ts">
import { computed } from 'vue';
import { Timer } from '@lucide/vue';
import { Slider } from '@/components/ui/slider';

const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const formattedBudget = computed(() => {
  const h = Math.floor(props.modelValue / 60);
  const m = props.modelValue % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
});

function onSliderChange(value: number[] | undefined) {
  if (value && value[0] !== undefined) {
    emit('update:modelValue', value[0]);
  }
}
</script>

<template>
  <div class="space-y-4 rounded-xl border border-outline-variant/10 bg-surface-container/50 p-6">
    <div class="flex items-center justify-between">
      <label class="text-body-sm font-medium text-muted-foreground">Tiempo objetivo</label>
      <span class="font-label-mono text-body-md text-primary">{{ formattedBudget }}</span>
    </div>

    <div class="flex items-center gap-4">
      <Timer class="size-4 text-muted-foreground" />
      <Slider
        :model-value="[modelValue]"
        :min="15"
        :max="480"
        :step="15"
        class="flex-1"
        @update:model-value="onSliderChange"
      />
    </div>

    <div class="flex justify-between text-[10px] font-medium uppercase tracking-tighter text-muted-foreground">
      <span>15m</span>
      <span>2h</span>
      <span>4h</span>
      <span>8h</span>
    </div>
  </div>
</template>