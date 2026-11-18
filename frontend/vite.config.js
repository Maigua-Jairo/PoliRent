import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  // Respaldo en desarrollo: sin VITE_API_URL las peticiones a /api se reenvían al backend local
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    cache: false,
  },
})
