// App-level state: the working document (persisted on every change, Hugo
// oninput parity), the active nav section, the current DetectionResult, and
// custom profiles. All domain math stays in src/core; this file only wires
// state to storage.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  clearStatementData,
  loadCustomProfiles,
  loadProfileDraft,
  loadWorkspace,
  saveCustomProfiles,
  saveProfileDraft,
  saveWorkspace,
  PersistenceError,
  type StoragePort,
  type Workspace,
} from '../../core/persist/index.ts';
import { cloneSampleDocument } from '../../core/sample/index.ts';
import { newProductRow, newReserveRow, newSublicenseRow } from '../../core/catalog/rows.ts';
import type {
  CustomImportProfile,
  DetectionResult,
  ProductRow,
  ReserveRow,
  StatementState,
  StatementType,
  SublicenseRow,
} from '../../core/types.ts';

export const SECTIONS = [
  'Statement data',
  'Product rows',
  'Reserve rows',
  'Sublicense rows',
  'Import / digest',
  'Custom import profiles',
  'Validation',
  'Review my statement',
  'About',
  'Version history',
] as const;

export type Section = (typeof SECTIONS)[number];

export interface AppStore {
  workspace: Workspace;
  section: Section;
  setSection: (s: Section) => void;
  detectedImport: DetectionResult | null;
  setDetectedImport: (r: DetectionResult | null) => void;
  customProfiles: CustomImportProfile[];
  setCustomProfiles: (profiles: CustomImportProfile[]) => void;
  profileDraft: Partial<CustomImportProfile> | undefined;
  setProfileDraft: (draft: Partial<CustomImportProfile>) => void;
  persistenceIssue: string | null;
  dismissPersistenceIssue: () => void;
  setState: (key: keyof StatementState, value: string) => void;
  replaceWorkspace: (ws: Workspace) => void;
  setProducts: (rows: ProductRow[]) => void;
  setReserves: (rows: ReserveRow[]) => void;
  setSublicenses: (rows: SublicenseRow[]) => void;
  addProduct: () => void;
  addReserve: () => void;
  addSublicense: () => void;
  setShowIds: (v: boolean) => void;
  setStatementType: (t: StatementType) => void;
  clearAll: () => void;
  loadSample: () => void;
}

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ storage, children }: { storage: StoragePort; children: ReactNode }) {
  const storageRef = useRef(storage);
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace(storageRef.current));
  const [section, setSection] = useState<Section>('Statement data');
  const [detectedImport, setDetectedImport] = useState<DetectionResult | null>(null);
  const [customProfiles, setCustomProfilesState] = useState<CustomImportProfile[]>(() =>
    loadCustomProfiles(storageRef.current),
  );
  const [profileDraft, setProfileDraftState] = useState<Partial<CustomImportProfile> | undefined>(() =>
    loadProfileDraft(storageRef.current),
  );
  const [persistenceIssue, setPersistenceIssue] = useState<string | null>(null);

  const persist = useCallback((ws: Workspace) => {
    try {
      saveWorkspace(storageRef.current, ws);
    } catch (err) {
      setPersistenceIssue(err instanceof PersistenceError ? err.message : String(err));
    }
  }, []);

  const update = useCallback(
    (mutate: (ws: Workspace) => Workspace) => {
      setWorkspace(prev => {
        const next = mutate(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const store = useMemo<AppStore>(
    () => ({
      workspace,
      section,
      setSection,
      detectedImport,
      setDetectedImport,
      customProfiles,
      setCustomProfiles: profiles => {
        setCustomProfilesState(profiles);
        try {
          saveCustomProfiles(storageRef.current, profiles);
        } catch (err) {
          setPersistenceIssue(err instanceof PersistenceError ? err.message : String(err));
        }
      },
      profileDraft,
      setProfileDraft: draft => {
        setProfileDraftState(draft);
        try {
          saveProfileDraft(storageRef.current, draft);
        } catch (err) {
          setPersistenceIssue(err instanceof PersistenceError ? err.message : String(err));
        }
      },
      persistenceIssue,
      dismissPersistenceIssue: () => setPersistenceIssue(null),
      setState: (key, value) => update(ws => ({ ...ws, state: { ...ws.state, [key]: value } })),
      replaceWorkspace: ws => update(() => ws),
      setProducts: rows => update(ws => ({ ...ws, products: rows })),
      setReserves: rows => update(ws => ({ ...ws, reserves: rows })),
      setSublicenses: rows => update(ws => ({ ...ws, sublicenses: rows })),
      addProduct: () => update(ws => ({ ...ws, products: [...ws.products, newProductRow()] })),
      addReserve: () => update(ws => ({ ...ws, reserves: [...ws.reserves, newReserveRow()] })),
      addSublicense: () => update(ws => ({ ...ws, sublicenses: [...ws.sublicenses, newSublicenseRow()] })),
      setShowIds: v => update(ws => ({ ...ws, showIds: v })),
      // Non-destructive by design (v2): switching to 'standard' keeps any
      // values already in the translation-only fields.
      setStatementType: t => update(ws => ({ ...ws, statementType: t })),
      clearAll: () => {
        // Parity: wipe statement keys only (profiles survive), reset to one
        // blank row each, showIds off, back to the Statement tab.
        const cleared = clearStatementData(storageRef.current);
        setWorkspace(cleared);
        setSection('Statement data');
      },
      loadSample: () => {
        // The Appendix B sample is a standard US domestic deal (v2).
        update(() => ({ ...cloneSampleDocument(), showIds: false, statementType: 'standard' }));
        setSection('Statement data');
      },
    }),
    [workspace, section, detectedImport, customProfiles, profileDraft, persistenceIssue, update],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStore must be used inside AppStoreProvider');
  return store;
}
