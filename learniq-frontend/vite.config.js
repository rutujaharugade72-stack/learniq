import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // any request starting with /api is forwarded to the Express backend
      '/api': 'http://localhost:5000',
    },
  },
})