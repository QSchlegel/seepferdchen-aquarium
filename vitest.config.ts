import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      '$app/environment': fileURLToPath(new URL('./src/test/app-environment.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    /**
     * Without this Vitest stubs every stylesheet to an empty string, so a test
     * that reads app.css with `?raw` silently checks nothing — which is what
     * the safe-area test was doing for the one file that defines `.page`.
     */
    css: true
  }
});
