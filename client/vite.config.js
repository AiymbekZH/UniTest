import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import lottieRegistryGuard from './vite-plugins/lottie-registry-guard.js'

export default defineConfig({
  plugins: [react(), lottieRegistryGuard()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5003',
      '/uploads': 'http://localhost:5003'
    }
  }
})
