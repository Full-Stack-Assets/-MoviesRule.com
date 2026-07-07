import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const contentDir = fileURLToPath(new URL('./content', import.meta.url));

// Vitest config for the unit suite. Mirrors the `@/` and `@/content/`
// path aliases from tsconfig.json so tests import modules exactly as app code
// does. Tests live under tests/ and are excluded from the Next production build
// (see tsconfig.json) so test tooling can never break a deploy.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/content\//, replacement: `${contentDir}/` },
      { find: /^@\//, replacement: `${srcDir}/` },
    ],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.d.ts'],
      reportsDirectory: './coverage',
      reporter: ['text-summary', 'html'],
    },
  },
});
