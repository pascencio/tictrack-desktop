<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Timer, Pause, CheckCircle, MoreHorizontal } from '@lucide/vue';
import { Button } from '@/components/ui/button';

const hours = ref(1);
const minutes = ref(49);
const seconds = ref(45);

let intervalId: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  intervalId = setInterval(() => {
    seconds.value++;
    if (seconds.value >= 60) {
      seconds.value = 0;
      minutes.value++;
    }
    if (minutes.value >= 60) {
      minutes.value = 0;
      hours.value++;
    }
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

const formattedTime = computed(() => {
  const h = String(hours.value).padStart(2, '0');
  const m = String(minutes.value).padStart(2, '0');
  const s = String(seconds.value).padStart(2, '0');
  return `${h}:${m}:${s}`;
});

const progressOffset = 138;
</script>

<template>
  <section class="glass-card relative flex flex-col items-center gap-8 overflow-hidden rounded-2xl p-8 md:flex-row">
    <div class="absolute left-0 top-0 h-1 w-full shimmer opacity-50" />

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
          class="text-primary transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <Timer class="size-8 text-primary" />
        <span class="font-label-mono mt-1 text-xs text-muted-foreground">SESIÓN ACTIVA</span>
      </div>
    </div>

    <div class="flex-1 text-center md:text-left">
      <h3 class="font-heading text-2xl font-semibold text-primary">
        Refactorización de API
      </h3>
      <p class="mb-6 text-muted-foreground">
        Proyecto: Backend Infra v2.4
      </p>
      <div class="font-display-timer timer-glow mb-6 tracking-tighter text-foreground">
        {{ formattedTime }}
      </div>
      <div class="flex flex-wrap justify-center gap-3 md:justify-start">
        <Button class="gap-2 rounded-xl px-8 py-6 font-bold">
          <Pause class="size-4" />
          Pausa
        </Button>
        <Button variant="outline" class="gap-2 rounded-xl px-8 py-6 font-bold">
          <CheckCircle class="size-4" />
          Completar
        </Button>
        <Button variant="outline" size="icon" class="rounded-xl">
          <MoreHorizontal class="size-4" />
        </Button>
      </div>
    </div>

    <div class="hidden border-l border-outline-variant/20 pl-8 lg:grid lg:grid-cols-1 lg:gap-4">
      <div class="text-right">
        <p class="font-label-mono text-xs uppercase text-muted-foreground">Objetivo Hoy</p>
        <p class="text-lg font-bold text-foreground">3h 00m</p>
      </div>
      <div class="text-right">
        <p class="font-label-mono text-xs uppercase text-muted-foreground">Racha Actual</p>
        <p class="text-lg font-bold text-tertiary">12 Días</p>
      </div>
    </div>
  </section>
</template>
