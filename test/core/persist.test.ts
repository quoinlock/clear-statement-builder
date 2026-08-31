// AC-PER-1/4/5/6 (PRD "Acceptance criteria > Persistence / schema").
import { describe, expect, it } from 'vitest';
import {
  HUGO_KEYS,
  KEYS,
  MemoryStorage,
  PersistenceError,
  clearStatementData,
  firstVisitMode,
  hugoMigrationAvailable,
  loadCustomProfiles,
  loadProfileDraft,
  loadWorkspace,
  migrateFromHugo,
  saveCustomProfiles,
  saveProfileDraft,
  saveWorkspace,
  setFirstVisitMode,
} from '../../src/core/persist/index.ts';
import { cloneSampleDocument, sample } from '../../src/core/sample/index.ts';
import type { CustomImportProfile } from '../../src/core/types.ts';

const profile: CustomImportProfile = {
  id: 'test-profile-1',
  name: 'Test',
  language: '',
  numberFormat: 'auto',
  splitPattern: '',
  fieldRules: '',
  abbreviations: '',
  productAliases: '',
  calculationHint: '',
};

describe('AC-PER-6: first visit', () => {
  it('empty CSB keys load the Appendix B sample (firstVisitMode=sample default)', () => {
    const storage = new MemoryStorage();
    expect(firstVisitMode(storage)).toBe('sample');
    const ws = loadWorkspace(storage);
    expect(ws.state).toEqual(sample);
    expect(ws.products).toHaveLength(4);
    expect(ws.showIds).toBe(false);
  });

  it('firstVisitMode=empty starts blank (flag-switchable per OQ3)', () => {
    const storage = new MemoryStorage();
    setFirstVisitMode(storage, 'empty');
    const ws = loadWorkspace(storage);
    expect(ws.state.licenseeName).toBe('');
    expect(ws.products).toHaveLength(1);
    expect(ws.products[0].earnings).toBe('');
  });
});

describe('AC-PER-1: reload restores the last saved document', () => {
  it('save then load round-trips edits', () => {
    const storage = new MemoryStorage();
    const ws = loadWorkspace(storage);
    ws.state.licenseeName = 'Edited Verlag';
    ws.products[0].earnings = '999.99';
    ws.showIds = true;
    saveWorkspace(storage, ws);
    const reloaded = loadWorkspace(storage);
    expect(reloaded.state.licenseeName).toBe('Edited Verlag');
    expect(reloaded.products[0].earnings).toBe('999.99');
    expect(reloaded.showIds).toBe(true);
  });

  it('corrupt JSON in one key falls back independently (Hugo readStored parity)', () => {
    const storage = new MemoryStorage();
    saveWorkspace(storage, { ...cloneSampleDocument(), showIds: false });
    storage.setItem(KEYS.products, '{not json');
    const ws = loadWorkspace(storage);
    expect(ws.state).toEqual(sample); // intact key kept
    expect(ws.products).toHaveLength(4); // fell back to sample products
  });
});

describe('AC-PER-4/5: Clear all key partition', () => {
  it('removes statement keys only; sample reload works after', () => {
    const storage = new MemoryStorage();
    saveWorkspace(storage, { ...cloneSampleDocument(), showIds: true });
    const cleared = clearStatementData(storage);
    expect(storage.getItem(KEYS.state)).toBeNull();
    expect(storage.getItem(KEYS.showIds)).toBeNull();
    expect(cleared.state.licenseeName).toBe('');
    expect(cleared.products).toEqual([
      { form: '', isbn: '', pubDate: '', listPrice: '', basis: '', rate: '', priorUnits: '', periodUnits: '', basisAmount: '', earnings: '' },
    ]);
    // Sample reload = loading with empty keys under mode 'sample'.
    expect(loadWorkspace(storage).state).toEqual(sample);
  });

  it('custom profiles and the profile draft survive Clear all', () => {
    const storage = new MemoryStorage();
    saveCustomProfiles(storage, [profile]);
    saveProfileDraft(storage, { name: 'Draft in progress' });
    clearStatementData(storage);
    expect(loadCustomProfiles(storage)).toEqual([profile]);
    expect(loadProfileDraft(storage)).toEqual({ name: 'Draft in progress' });
  });
});

describe('Hugo key migration (opt-in banner)', () => {
  it('is offered only when Hugo data exists and CSB has none', () => {
    const storage = new MemoryStorage();
    expect(hugoMigrationAvailable(storage)).toBe(false);
    storage.setItem(HUGO_KEYS.state, JSON.stringify(sample));
    expect(hugoMigrationAvailable(storage)).toBe(true);
    storage.setItem(KEYS.state, JSON.stringify(sample));
    expect(hugoMigrationAvailable(storage)).toBe(false);
  });

  it('copies Hugo keys to CSB keys without overwriting existing CSB data', () => {
    const storage = new MemoryStorage();
    storage.setItem(HUGO_KEYS.state, JSON.stringify({ ...sample, licenseeName: 'From Hugo' }));
    storage.setItem(HUGO_KEYS.customImportProfiles, JSON.stringify([profile]));
    storage.setItem(KEYS.customImportProfiles, JSON.stringify([]));
    migrateFromHugo(storage);
    expect(loadWorkspace(storage).state.licenseeName).toBe('From Hugo');
    // Existing CSB profiles were not overwritten.
    expect(loadCustomProfiles(storage)).toEqual([]);
  });
});

describe('quota failures surface as PersistenceError', () => {
  it('wraps setItem throws', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    expect(() => saveWorkspace(storage, { ...cloneSampleDocument(), showIds: false })).toThrow(PersistenceError);
  });
});
