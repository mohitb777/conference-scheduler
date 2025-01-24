import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://conference-scheduler-bay.vercel.app',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

