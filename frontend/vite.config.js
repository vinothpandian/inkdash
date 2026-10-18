import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { openThreadsPreview } from './dev/openThreadsPreview.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss(), openThreadsPreview()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
