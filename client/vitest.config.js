import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest configuration for the UniTest client.
// - environment: happy-dom (lightweight DOM, faster than jsdom for component tests)
// - globals: true (describe/it/expect available without imports, matches @testing-library/jest-dom usage)
// - setupFiles: ./vitest.setup.js (jest-dom matchers, matchMedia / IntersectionObserver mocks,
//   fast-check global numRuns, and module-cache reset registry)
// fast-check's `numRuns: 100` is configured in vitest.setup.js via fc.configureGlobal,
// since fast-check has no Vitest config field of its own.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.{test,property.test}.{js,jsx,ts,tsx}', '__tests__/**/*.{test,property.test}.{js,jsx,ts,tsx}'],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
})
