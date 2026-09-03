// AC-SEC-1 gate: the production build must not reference cdnjs or any
// third-party CDN as a runtime source (pdf.js and its worker are vendored
// same-origin). Also asserts both static entry pages were emitted — the
// landing page at / and the builder at /builder/. Run after `vite build`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Optional argv[2] overrides the directory (e.g. a build with --outDir).
const dist = process.argv[2] ?? join(import.meta.dirname, '..', 'dist');
const offenders = [];
function scan(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      scan(p);
      continue;
    }
    if (!/\.(js|html|css)$/.test(name.name) || name.name.endsWith('.map')) continue;
    const src = readFileSync(p, 'utf8');
    for (const pattern of [/cdnjs\.cloudflare\.com/, /unpkg\.com/, /cdn\.jsdelivr\.net/]) {
      if (pattern.test(src)) offenders.push(`${p}: ${pattern}`);
    }
  }
}
scan(dist);
for (const page of ['index.html', 'builder/index.html']) {
  if (!existsSync(join(dist, page))) {
    console.error(`check-dist: missing entry page dist/${page}`);
    process.exit(1);
  }
}
if (offenders.length) {
  console.error('CDN references found in dist (AC-SEC-1 violation):');
  offenders.forEach(o => console.error('  ' + o));
  process.exit(1);
}
console.log('check-dist: both entry pages present; no third-party CDN references in the build (AC-SEC-1).');
