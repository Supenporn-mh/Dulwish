import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@upos/shared-types': resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  server: { port: 3002 },
})
