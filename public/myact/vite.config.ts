import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { ENVIRONMENT_CONFIG } from './src/config/environment'

export default defineConfig({
  plugins: [react()],
  base: ENVIRONMENT_CONFIG.DEV_SERVER.BASE_PATH,
  server: {
    port: ENVIRONMENT_CONFIG.DEV_SERVER.PORT,
    host: ENVIRONMENT_CONFIG.DEV_SERVER.HOST
  },
  publicDir: 'public',  // Enable public directory for static assets
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          ui: ['@mui/material', '@mui/icons-material'],
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/hooks': resolve(__dirname, 'src/hooks'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/stores': resolve(__dirname, 'src/stores'),
    }
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet']
  }
})