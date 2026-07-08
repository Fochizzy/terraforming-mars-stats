import path from 'node:path';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: [
      ...configDefaults.exclude,
      '.worktrees/**',
      '_r6/**',
      '.claude/**',
      '.expo/**',
      '.fresh-*/**',
      '.codex-deploy-*/**',
      '.deploy-*/**',
      '.live-*/**',
      '.tmp-*/**',
      'test-results/**',
      'tests/e2e/**',
    ],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
