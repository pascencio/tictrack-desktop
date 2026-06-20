<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue';
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppSidebar />
    <main class="ml-60 h-screen overflow-y-auto bg-background">
      <slot />
    </main>
  </div>
</template>
