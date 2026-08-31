import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        // Framework-free domain core: must run with zero DOM (PRD Key
        // Decision 10). Anything in src/core that touches window/document
        // fails here by construction.
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['test/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['test/ui/**/*.test.{ts,tsx}'],
          setupFiles: ['test/ui/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      thresholds: {
        // PRD MoSCoW column B: >= 90% line coverage on src/core.
        lines: 90,
      },
    },
  },
});
