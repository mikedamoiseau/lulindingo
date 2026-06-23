import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    // e2e/ holds Playwright specs (browser runner), not vitest specs.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
