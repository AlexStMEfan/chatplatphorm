import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: "/",
  plugins: [
    tailwindcss(),
  ],
  preview: {
    port: 5173,        // ← стандартный порт Vite
    strictPort: true,
  },
  server: {
    port: 5173,        // ← не 80!
    strictPort: true,
    host: true,        // ← OK, чтобы был доступен извне контейнера
    // origin можно убрать — Vite сам определит
  },
})