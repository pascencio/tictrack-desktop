<script setup lang="ts">
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  Puzzle,
  Settings,
  Plus,
} from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', active: true },
  { label: 'Tareas', icon: ListTodo, href: '#', active: false },
  { label: 'Reportes', icon: BarChart3, href: '#', active: false },
  { label: 'Integraciones', icon: Puzzle, href: '#', active: false },
  { label: 'Configuración', icon: Settings, href: '#', active: false },
];
</script>

<template>
  <aside class="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-outline-variant/10 bg-surface-container-lowest px-3 py-5 sm:px-4 sm:py-6">
    <div class="mb-6 px-1 sm:mb-8">
      <div class="mb-3 flex items-center sm:mb-4">
        <img
          src="/tictrack-logo-trim.png"
          alt="TicTrack"
          class="w-full max-w-[12rem] object-contain object-left"
        />
      </div>
      <p class="max-w-[11rem] text-xs leading-snug text-muted-foreground opacity-70 sm:max-w-none sm:text-sm">
        Productividad de Alto Rendimiento
      </p>
    </div>

    <Button class="mb-6 w-full gap-2 rounded-xl bg-primary-container font-bold text-on-primary-container shadow-lg shadow-primary/20">
      <Plus class="size-4" />
      Nueva Tarea
    </Button>

    <nav class="flex-1 space-y-1">
      <a
        v-for="item in navItems"
        :key="item.label"
        :href="item.href"
        class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors"
        :class="item.active
          ? 'border-r-4 border-primary bg-primary-container/10 font-bold text-primary'
          : 'font-medium text-muted-foreground hover:bg-surface-variant/50'"
      >
        <component :is="item.icon" class="size-5 shrink-0" />
        {{ item.label }}
      </a>
    </nav>

    <Separator class="mb-4 bg-outline-variant/10" />

    <div class="flex items-center gap-3 px-1">
      <Avatar class="size-10 border border-border/20">
        <AvatarImage src="https://api.dicebear.com/9.x/notionists/svg?seed=Alex" alt="Alex Rivera" />
        <AvatarFallback>AR</AvatarFallback>
      </Avatar>
      <div class="min-w-0 overflow-hidden">
        <p class="truncate text-sm font-semibold text-foreground">Alex Rivera</p>
        <p class="truncate text-xs text-muted-foreground">Plan Pro Premium</p>
      </div>
    </div>
  </aside>
</template>
