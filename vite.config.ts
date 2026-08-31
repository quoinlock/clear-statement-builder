import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Privacy-first, browser-only SPA: no backend, no analytics, no CDN at
// runtime (PRD Key Decisions 1 and 9). pdf.js is vendored and lazy-loaded.
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
});
