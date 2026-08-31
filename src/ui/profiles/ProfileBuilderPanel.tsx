// F7 / Appendix C: Custom import profiles panel — draft editor (autosaved),
// Ullstein-style template, saved-profiles table (Edit / Delete-with-confirm,
// the one place Hugo confirms), profiles JSON export/import.
import { useRef, useState } from 'react';
import {
  DEFAULT_PROFILE_DRAFT,
  ULLSTEIN_STYLE_TEMPLATE,
  newProfileId,
  parseRuleLines,
} from '../../core/import/customProfiles.ts';
import { IMPORT_FIELD_OPTIONS } from '../../core/import/helpers.ts';
import { bisgId } from '../../core/catalog/fieldMeta.ts';
import { parseCustomProfiles, serializeCustomProfiles } from '../../core/schema/index.ts';
import { useAppStore } from '../app/store.tsx';
import { downloadFile } from '../app/download.ts';
import type { CustomImportProfile } from '../../core/types.ts';

export function ProfileBuilderPanel() {
  const store = useAppStore();
  const draft: CustomImportProfile = { ...DEFAULT_PROFILE_DRAFT, ...store.profileDraft };
  const [quickField, setQuickField] = useState<string>('licenseeContractId');
  const [status, setStatus] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  function setDraft(patch: Partial<CustomImportProfile>) {
    store.setProfileDraft({ ...draft, ...patch });
  }

  function saveProfile() {
    if (!draft.name.trim()) {
      setStatus('Please enter a profile name.');
      return;
    }
    const id = draft.id || newProfileId(draft.name);
    const profile: CustomImportProfile = { ...draft, id };
    const profiles = [...store.customProfiles];
    const idx = profiles.findIndex(p => p.id === id);
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    store.setCustomProfiles(profiles);
    store.setProfileDraft(profile);
    setStatus('Custom profile saved. Select it in the Import / digest profile dropdown.');
  }

  function insertQuickRule() {
    const rule = 'Publisher label\\s*:?\\s*([^\\n]+) => ' + quickField;
    setDraft({ fieldRules: draft.fieldRules.trim() ? draft.fieldRules + '\n' + rule : rule });
  }

  function editProfile(id: string) {
    const p = store.customProfiles.find(x => x.id === id);
    if (p) store.setProfileDraft({ ...DEFAULT_PROFILE_DRAFT, ...p });
  }

  function deleteProfile(id: string) {
    if (!window.confirm('Delete this custom import profile?')) return;
    store.setCustomProfiles(store.customProfiles.filter(p => p.id !== id));
    if (draft.id === id) store.setProfileDraft({ ...DEFAULT_PROFILE_DRAFT });
  }

  function exportProfiles() {
    downloadFile(
      'clear-statement-custom-import-profiles.json',
      'application/json',
      JSON.stringify(serializeCustomProfiles(store.customProfiles), null, 2),
    );
  }

  async function importProfiles() {
    const file = importRef.current?.files?.[0];
    if (!file) {
      setStatus('Choose a JSON profile file first.');
      return;
    }
    try {
      const incoming = parseCustomProfiles(JSON.parse(await file.text()));
      const existing = [...store.customProfiles];
      for (const p of incoming) {
        const withId = { ...p, id: p.id || newProfileId(p.name) };
        const idx = existing.findIndex(x => x.id === withId.id);
        if (idx >= 0) existing[idx] = withId;
        else existing.push(withId);
      }
      store.setCustomProfiles(existing);
      setStatus('Profiles imported.');
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <>
      <h2>Custom import profiles</h2>
      <div className="issue good">
        <div className="issue-head">
          <span>Create reusable import rules</span>
          <span>{store.customProfiles.length} saved</span>
        </div>
        <p>
          Use simple rules first. Advanced users may enter regular expressions with one capture group for the
          value to extract.
        </p>
      </div>
      {status ? (
        <p role="status" className="issue warn" style={{ padding: '8px 12px' }}>
          {status}
        </p>
      ) : null}
      <div className="grid2">
        <div className="field">
          <label>
            Profile name
            <input value={draft.name} onChange={e => setDraft({ name: e.target.value })} />
          </label>
        </div>
        <div className="field">
          <label>
            Statement language
            <input value={draft.language} onChange={e => setDraft({ language: e.target.value })} />
          </label>
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>
            Number format
            <select
              value={draft.numberFormat}
              onChange={e => setDraft({ numberFormat: e.target.value as CustomImportProfile['numberFormat'] })}
            >
              <option value="auto">Auto-detect</option>
              <option value="european">European: 1.234,56</option>
              <option value="us">US/UK: 1,234.56</option>
            </select>
          </label>
        </div>
        <div className="field">
          <label>
            Split rule / start new statement when this pattern appears
            <input
              placeholder="Example: Interne VertragsNr\.?\s*(\d+)"
              value={draft.splitPattern}
              onChange={e => setDraft({ splitPattern: e.target.value })}
            />
          </label>
        </div>
      </div>
      <div className="field">
        <label>
          Field mapping rules <span className="badge recommended">rule syntax</span>
          <textarea
            rows={6}
            placeholder={'One rule per line, for example:\nContract No\\.?\\s*([A-Z0-9-]+) => licenseeContractId\nStatement Date\\s*:?\\s*([^\\n]+) => statementDate'}
            value={draft.fieldRules}
            onChange={e => setDraft({ fieldRules: e.target.value })}
          />
        </label>
        <div className="panel-sub">
          Available BISG fields:{' '}
          <select aria-label="Quick field" value={quickField} onChange={e => setQuickField(e.target.value)}>
            {IMPORT_FIELD_OPTIONS.map(k => (
              <option key={k} value={k}>
                {k} {bisgId(k) ? `— ${bisgId(k)}` : ''}
              </option>
            ))}
          </select>{' '}
          <button type="button" className="btn small" onClick={insertQuickRule}>
            Insert selected field
          </button>
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>
            Abbreviation dictionary
            <textarea
              rows={4}
              placeholder={'NVE => Net Publisher Receipts\nHC => Hardcover'}
              value={draft.abbreviations}
              onChange={e => setDraft({ abbreviations: e.target.value })}
            />
          </label>
        </div>
        <div className="field">
          <label>
            Product form aliases
            <textarea
              rows={4}
              placeholder={'TB => Paperback\nHC => Hardcover\nAudio DL => Audiobook Download'}
              value={draft.productAliases}
              onChange={e => setDraft({ productAliases: e.target.value })}
            />
          </label>
        </div>
      </div>
      <div className="field">
        <label>
          Calculation hint
          <input value={draft.calculationHint} onChange={e => setDraft({ calculationHint: e.target.value })} />
        </label>
      </div>
      <div className="appbar-buttons" style={{ margin: '10px 0' }}>
        <button type="button" className="btn btn-green" onClick={saveProfile}>
          Save profile
        </button>
        <button type="button" className="btn" onClick={() => store.setProfileDraft({ ...ULLSTEIN_STYLE_TEMPLATE })}>
          Load Ullstein-style template
        </button>
        <button type="button" className="btn" onClick={exportProfiles}>
          Export profiles JSON
        </button>
        <input ref={importRef} type="file" accept=".json,application/json" aria-label="Profiles JSON file" />
        <button type="button" className="btn" onClick={importProfiles}>
          Import profiles JSON
        </button>
      </div>
      <h3>Saved custom profiles</h3>
      {store.customProfiles.length ? (
        <table className="import-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Split rule</th>
              <th>Field rules</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {store.customProfiles.map(p => (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b>
                  <div className="panel-sub">{p.language || ''}</div>
                </td>
                <td className="mono">{p.splitPattern || '—'}</td>
                <td>{parseRuleLines(p.fieldRules).length}</td>
                <td>
                  <button type="button" className="btn small" onClick={() => editProfile(p.id)}>
                    Edit
                  </button>{' '}
                  <button type="button" className="btn btn-danger small" onClick={() => deleteProfile(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="panel-sub">No custom profiles saved yet.</p>
      )}
      <div className="issue warn" style={{ marginTop: 10 }}>
        <p>
          <b>Important:</b> A custom profile helps detect fields, but it never certifies or audits a statement.
          Review detected values and unmapped lines before applying.
        </p>
      </div>
    </>
  );
}
