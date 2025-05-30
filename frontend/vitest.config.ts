import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Use Vitest global APIs like describe, test, expect
    environment: 'jsdom', // Simulate DOM environment
    setupFiles: './src/setupTests.ts', // Setup file for tests (e.g., to extend expect with jest-dom matchers)
    css: false, // Disable CSS processing for tests if not needed / causing issues
  },
});
