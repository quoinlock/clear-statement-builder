// StoragePort seam (PRD Key Decision 10): the interface and an in-memory
// fake live in core; the real localStorage adapter lives in src/persist.
// Key layout per PRD "In-memory + persistence": statement keys are cleared
// by Clear all; profile keys deliberately survive it.
import { emptyProductRow, emptyReserveRow, emptyState, emptySublicenseRow } from '../catalog/rows.ts';
import { cloneSampleDocument } from '../sample/index.ts';
import type {
  CustomImportProfile,
  ProductRow,
  ReserveRow,
  StatementState,
  SublicenseRow,
} from '../types.ts';

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements StoragePort {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** Thrown when the underlying storage rejects a write (e.g. quota). */
export class PersistenceError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}

export const KEYS = {
  state: 'csb.v1.state',
  products: 'csb.v1.products',
  reserves: 'csb.v1.reserves',
  sublicenses: 'csb.v1.sublicenses',
  showIds: 'csb.v1.showIds',
  customImportProfiles: 'csb.v1.customImportProfiles',
  customProfileDraft: 'csb.v1.customProfileDraft',
  firstVisitMode: 'csb.v1.firstVisitMode',
} as const;

/** Cleared by Clear all (statement data + the showIds toggle). */
export const STATEMENT_KEYS = [KEYS.state, KEYS.products, KEYS.reserves, KEYS.sublicenses, KEYS.showIds] as const;

/** NOT cleared by Clear all. */
export const PROFILE_KEYS = [KEYS.customImportProfiles, KEYS.customProfileDraft] as const;

/** Hugo v1.7 origin keys, offered for one-time opt-in migration. */
export const HUGO_KEYS = {
  state: 'bisgState',
  products: 'bisgProducts',
  reserves: 'bisgReserves',
  sublicenses: 'bisgSublicenses',
  showIds: 'bisgShowIds',
  customImportProfiles: 'hugoCustomImportProfiles',
  customProfileDraft: 'hugoCustomProfileDraft',
} as const;

export interface Workspace {
  state: StatementState;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
  showIds: boolean;
}

function readJson<T>(storage: StoragePort, key: string): T | undefined {
  const raw = storage.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(storage: StoragePort, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw new PersistenceError(
      'Could not save to browser storage (it may be full). Your latest change was not persisted.',
      err,
    );
  }
}

export type FirstVisitMode = 'sample' | 'empty';

/** Local feature flag; ships as 'sample' (Hugo parity) until Open Question 3 is answered. */
export function firstVisitMode(storage: StoragePort): FirstVisitMode {
  return storage.getItem(KEYS.firstVisitMode) === 'empty' ? 'empty' : 'sample';
}

export function setFirstVisitMode(storage: StoragePort, mode: FirstVisitMode): void {
  storage.setItem(KEYS.firstVisitMode, mode);
}

function emptyWorkspace(): Workspace {
  return {
    state: emptyState(),
    products: [emptyProductRow()],
    reserves: [emptyReserveRow()],
    sublicenses: [emptySublicenseRow()],
    showIds: false,
  };
}

/**
 * Loads the working document. First visit (no stored state) honors
 * firstVisitMode: 'sample' loads the Appendix B fixture (parity), 'empty'
 * starts blank. Each key falls back independently, mirroring Hugo readStored.
 */
export function loadWorkspace(storage: StoragePort): Workspace {
  const fallback = firstVisitMode(storage) === 'sample' ? { ...cloneSampleDocument(), showIds: false } : emptyWorkspace();
  return {
    state: readJson<StatementState>(storage, KEYS.state) ?? fallback.state,
    products: readJson<ProductRow[]>(storage, KEYS.products) ?? fallback.products,
    reserves: readJson<ReserveRow[]>(storage, KEYS.reserves) ?? fallback.reserves,
    sublicenses: readJson<SublicenseRow[]>(storage, KEYS.sublicenses) ?? fallback.sublicenses,
    showIds: readJson<boolean>(storage, KEYS.showIds) ?? fallback.showIds,
  };
}

export function saveWorkspace(storage: StoragePort, ws: Workspace): void {
  writeJson(storage, KEYS.state, ws.state);
  writeJson(storage, KEYS.products, ws.products);
  writeJson(storage, KEYS.reserves, ws.reserves);
  writeJson(storage, KEYS.sublicenses, ws.sublicenses);
  writeJson(storage, KEYS.showIds, ws.showIds);
}

/** Clear all: removes statement keys only; custom profiles and draft survive. */
export function clearStatementData(storage: StoragePort): Workspace {
  for (const key of STATEMENT_KEYS) storage.removeItem(key);
  return emptyWorkspace();
}

export function loadCustomProfiles(storage: StoragePort): CustomImportProfile[] {
  return readJson<CustomImportProfile[]>(storage, KEYS.customImportProfiles) ?? [];
}

export function saveCustomProfiles(storage: StoragePort, profiles: CustomImportProfile[]): void {
  writeJson(storage, KEYS.customImportProfiles, profiles);
}

export function loadProfileDraft(storage: StoragePort): Partial<CustomImportProfile> | undefined {
  return readJson<Partial<CustomImportProfile>>(storage, KEYS.customProfileDraft);
}

export function saveProfileDraft(storage: StoragePort, draft: Partial<CustomImportProfile>): void {
  writeJson(storage, KEYS.customProfileDraft, draft);
}

/**
 * Hugo-key migration is opt-in via a one-time banner (never a silent
 * overwrite): offered only when Hugo statement data exists and CSB has none.
 */
export function hugoMigrationAvailable(storage: StoragePort): boolean {
  return storage.getItem(HUGO_KEYS.state) != null && storage.getItem(KEYS.state) == null;
}

export function migrateFromHugo(storage: StoragePort): void {
  const pairs: [hugo: string, csb: string][] = [
    [HUGO_KEYS.state, KEYS.state],
    [HUGO_KEYS.products, KEYS.products],
    [HUGO_KEYS.reserves, KEYS.reserves],
    [HUGO_KEYS.sublicenses, KEYS.sublicenses],
    [HUGO_KEYS.showIds, KEYS.showIds],
    [HUGO_KEYS.customImportProfiles, KEYS.customImportProfiles],
    [HUGO_KEYS.customProfileDraft, KEYS.customProfileDraft],
  ];
  for (const [hugoKey, csbKey] of pairs) {
    const value = storage.getItem(hugoKey);
    if (value != null && storage.getItem(csbKey) == null) {
      try {
        storage.setItem(csbKey, value);
      } catch (err) {
        throw new PersistenceError('Could not migrate Hugo data into browser storage.', err);
      }
    }
  }
}
