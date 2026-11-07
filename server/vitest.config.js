/**
 * @file vitest.config.js
 * @description Vitest configuration for server-side unit tests.
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['../tests/**/*.test.js', 'tests/**/*.test.js'],
    exclude: ['node_modules/**', 'client/**'],
    root: __dirname,
    reporter: 'verbose',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/server.js']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});

