// Integration test setup for Node.js environment
// No DOM mocking needed for API tests

import { vi } from 'vitest'

// Mock console methods if needed for cleaner output
if (process.env.VITEST_INTEGRATION !== 'true') {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
}

// Increase timeout for network requests
vi.setConfig({ testTimeout: 30000 })