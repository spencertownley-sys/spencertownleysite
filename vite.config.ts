import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    // The illustrated SVGs are large; keep them as separate cacheable files.
    assetsInlineLimit: 0,
  },
})
