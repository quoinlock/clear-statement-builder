// F5: score + teal bar, up to 14 incomplete checks, up to 8 calculation
// warnings, four-category legend, green states when everything passes.
import { calculationWarnings } from '../../core/calc/index.ts';
import { bisgId } from '../../core/catalog/fieldMeta.ts';
import { validation } from '../../core/validation/index.ts';
import { useAppStore } from '../app/store.tsx';

export function ValidationPanel() {
  const { workspace } = useAppStore();
  const { state, products, reserves, sublicenses, statementType } = workspace;
  const v = validation(state, products, sublicenses, statementType);
  const warnings = calculationWarnings(state, products, reserves, sublicenses);
  const prioritized = v.checks.filter(c => !c.ok).slice(0, 14);

  return (
    <>
      <h2>Validation</h2>
      <p className="panel-sub">
        Presence checks against the BISG-aligned field catalog.
        {statementType === 'standard' ? ' Translation-only fields are excluded (standard statement).' : ''}
      </p>
      <div className="score">
        <span id="scoreText">{v.score}% required complete</span>
        <div className="scorebar-track">
          <div className="scorebar" style={{ width: `${v.score}%` }} />
        </div>
      </div>
      {prioritized.length ? (
        prioritized.map(c => (
          <div key={c.label} className={`issue ${c.cat === 'Required' ? 'bad' : 'warn'}`}>
            <div className="issue-head">
              <span>{c.label}</span>
              <span className={`badge ${c.cat.toLowerCase()}`}>{c.cat}</span>
            </div>
            <p>
              {bisgId(c.key) ? `${bisgId(c.key)} — ` : ''}
              Missing or blank. Complete this before using the statement as a BISG example.
            </p>
          </div>
        ))
      ) : (
        <div className="issue good">
          <div className="issue-head">
            <span>Required fields complete</span>
            <span className="badge required">Required</span>
          </div>
          <p>Recommended, conditional, and remittance fields should still be reviewed for applicability.</p>
        </div>
      )}
      {warnings.length ? (
        <>
          <div className="issue warn">
            <div className="issue-head">
              <span>Calculation warnings</span>
              <span className="badge recommended">Review</span>
            </div>
            <p>
              Found {warnings.length} calculation issue{warnings.length === 1 ? '' : 's'}. These do not block
              export, but should be reviewed before presenting the statement.
            </p>
          </div>
          {warnings.slice(0, 8).map(w => (
            <div key={w.label} className="issue warn">
              <div className="issue-head">
                <span>{w.label}</span>
                <span className="badge recommended">Formula</span>
              </div>
              <p>{w.detail}</p>
            </div>
          ))}
        </>
      ) : (
        <div className="issue good">
          <div className="issue-head">
            <span>No calculation warnings</span>
            <span className="badge required">OK</span>
          </div>
          <p>Entered totals are consistent with the current calculation checks.</p>
        </div>
      )}
      <div className="issue">
        <div className="issue-head">
          <span>Legend</span>
        </div>
        <p>
          <b>Required</b> = core BISG statement field. <b>Recommended</b> = best-practice detail.{' '}
          <b>Conditional</b> = required when applicable. <b>Remittance</b> = payment/tax advice field.
        </p>
      </div>
    </>
  );
}
