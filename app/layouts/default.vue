<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue';
import MissingConfigBanner from '@/components/layout/MissingConfigBanner.vue';
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppSidebar />
    <main class="ml-60 h-screen overflow-y-auto bg-background">
      <div class="border-b border-outline-variant/10 bg-surface-container-low px-8 py-3">
        <MissingConfigBanner />
      </div>
      <slot />
    </main>
  </div>
</template>