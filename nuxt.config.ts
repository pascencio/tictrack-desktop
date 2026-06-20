import { defineNuxtConfig } from 'nuxt/config';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  ssr: false,
  telemetry: false,
  css: ['~/assets/css/tailwind.css'],
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },

  devServer: {
    host: host || 'localhost',
    port: 3000,
  },

  vite: {
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
  },

  nitro: {
    output: {
      publicDir: './dist',
    },
  },

  ignore: ['**/src-tauri/**'],
});