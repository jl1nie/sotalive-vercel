/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Configuration for integration tests
// These tests focus on component interactions and store integration
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/test/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'src/test/integration/e2e.*.test.ts', // Exclude E2E tests from integration run
    ],
    // Integration tests may need more time
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/stores/**/*.ts',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/__tests__/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})