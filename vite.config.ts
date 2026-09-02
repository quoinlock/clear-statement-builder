import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Privacy-first, browser-only SPA: no backend, no analytics, no CDN at
// runtime (PRD Key Decisions 1 and 9). pdf.js is vendored and lazy-loaded.

// Same policy as public/_headers and docker/nginx.conf.template, minus
// frame-ancestors (not honoured in a meta tag). Injected only into the
// production build: hosts that cannot set response headers (GitHub Pages)
// still get a CSP, and the dev server's HMR websocket is left alone.
const CSP =
  "default-src 'self'; script-src 'self'; worker-src 'self' blob:; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'none'";

function cspMeta(): Plugin {
  return {
    name: 'csb-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  // GitHub Pages serves a project site under /<repo>/; the workflow sets
  // BASE_PATH. Everything else (Docker, Netlify-style hosts) stays at "/".
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), cspMeta()],
  build: {
    sourcemap: true,
  },
});
