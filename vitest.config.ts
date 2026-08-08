import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      '$app/environment': fileURLToPath(new URL('./src/test/app-environment.ts', import.meta.url))
    }
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
