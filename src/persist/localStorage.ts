// The real browser adapter for the core StoragePort. This is the only place
// that touches window.localStorage (PRD Key Decision 10). Storage is
// unencrypted origin localStorage by design; the OS user account is the
// confidentiality boundary (documented in Help/About).
import type { StoragePort } from '../core/persist/index.ts';
import { MemoryStorage } from '../core/persist/index.ts';

export function browserStorage(): StoragePort {
  try {
    const ls = window.localStorage;
    // Some privacy modes expose localStorage but throw on write.
    const probe = '__csb_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: key => ls.getItem(key),
      setItem: (key, value) => ls.setItem(key, value),
      removeItem: key => ls.removeItem(key),
    };
  } catch {
    // Fall back to a session-lifetime in-memory store rather than crashing;
    // the UI surfaces that persistence is unavailable.
    return new MemoryStorage();
  }
}
