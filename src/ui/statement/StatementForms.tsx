// Statement data entry: four tabs (Statement default), Show-BISG-IDs
// toggle (persisted), per-field badges, persist on every keystroke. In v2
// standard mode the translation-only fields render disabled (values are
// kept — the statement-type toggle is non-destructive).
import { useState } from 'react';
import { GROUPS, GROUP_NAMES, type GroupName } from '../../core/catalog/groups.ts';
import { fieldLabel, isFieldApplicable } from '../../core/catalog/applicability.ts';
import { useAppStore } from '../app/store.tsx';
import { MetaBadges } from './Badges.tsx';

export function StatementForms() {
  const store = useAppStore();
  const [tab, setTab] = useState<GroupName>('Statement');
  const { state, statementType } = store.workspace;

  return (
    <>
      <h2>Statement data</h2>
      <p className="panel-sub">All values persist locally in your browser as you type.</p>
      <div role="tablist" aria-label="Statement field groups" className="tabs">
        {GROUP_NAMES.map(name => (
          <button
            key={name}
            role="tab"
            type="button"
            aria-selected={tab === name}
            className={`tab${tab === name ? ' active' : ''}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <label className="show-ids">
        <input
          type="checkbox"
          checked={store.workspace.showIds}
          onChange={e => store.setShowIds(e.target.checked)}
        />{' '}
        Show BISG field IDs in preview
      </label>
      <div role="tabpanel" aria-label={tab} className="section-form">
        {GROUPS[tab].map(field => {
          const applicable = isFieldApplicable(field.key, statementType);
          return (
          <div className={`field${applicable ? '' : ' field-na'}`} key={field.key}>
            <label>
              {fieldLabel(field.label, field.key, statementType)} <MetaBadges fieldKey={field.key} />
              {field.control === 'textarea' ? (
                <textarea
                  value={state[field.key]}
                  rows={5}
                  disabled={!applicable}
                  onChange={e => store.setState(field.key, e.target.value)}
                />
              ) : (
                <input
                  value={state[field.key]}
                  disabled={!applicable}
                  onChange={e => store.setState(field.key, e.target.value)}
                />
              )}
            </label>
            {!applicable ? (
              <p className="panel-sub field-na-hint">
                Not applicable to standard statements. The value is kept and restored if you switch back to
                Translation.
              </p>
            ) : null}
            {field.key === 'openingBalance' ? (
              <p className="panel-sub" style={{ margin: '4px 0 0' }}>
                A negative opening balance usually means part of the advance is still unearned and carries
                forward. Payment Due = Opening Balance + Closing Balance, so an unearned advance reduces the
                payment.
              </p>
            ) : null}
          </div>
          );
        })}
      </div>
    </>
  );
}
