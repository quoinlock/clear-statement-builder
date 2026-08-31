// Enforces PRD Key Decision 2/10: src/core is framework-free and DOM-free.
// It must not import react, and must not reference window, document, or
// localStorage. (The core test project also runs in a plain node
// environment, so any accidental DOM use fails at runtime too.)
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function coreFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...coreFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'core');

describe('src/core boundaries', () => {
  it('never imports react or DOM-touching modules', () => {
    for (const file of coreFiles(CORE)) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from\s+['"]react/);
      expect(src, file).not.toMatch(/from\s+['"].*\/persist\/localStorage/);
    }
  });

  it('never references window, document, or localStorage', () => {
    for (const file of coreFiles(CORE)) {
      const src = readFileSync(file, 'utf8');
      // Property access / call / subscript only, so prose in comments
      // ("working document. showIds ...") doesn't trip the check.
      expect(src, file).not.toMatch(/\bwindow\s*[.[(]\s*\w/);
      expect(src, file).not.toMatch(/\bdocument\s*[.[(]\s*\w/);
      expect(src, file).not.toMatch(/\blocalStorage\s*[.[(]\s*\w/);
    }
  });
});
