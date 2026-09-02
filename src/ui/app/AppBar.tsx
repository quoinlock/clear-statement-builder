// Layout A ("Focused workspace"): a single-row app bar — brand, statement
// type, completeness meter, and four actions. Secondary actions (Load
// sample, Clear all) live in the More menu; Help/About/Versions live in the
// side-nav footer.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { totals as computeTotals, calculationWarnings } from '../../core/calc/index.ts';
import { validation } from '../../core/validation/index.ts';
import {
  serializeDocument,
  serializeStatementCsv,
  statementFilename,
} from '../../core/schema/index.ts';
import type { StatementDocument, StatementType } from '../../core/types.ts';
import { useAppStore } from './store.tsx';
import { downloadFile } from './download.ts';
import { LOGO_SRC } from '../brand.ts';

export const APP_VERSION = 'v2.1.0';

const STATEMENT_TYPES: [type: StatementType, label: string][] = [
  ['standard', 'Standard'],
  ['translation', 'Translation'],
];

function currentDocument(ws: ReturnType<typeof useAppStore>['workspace']): StatementDocument {
  return {
    version: '1.1.0',
    generatedAt: new Date().toISOString(),
    product: 'clear-statement-builder',
    priorArt: 'hugo-prototype-v1.7',
    statementType: ws.statementType,
    state: ws.state,
    products: ws.products,
    reserves: ws.reserves,
    sublicenses: ws.sublicenses,
  };
}

interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** Small accessible dropdown: closes on Escape, outside click, or selection. */
function Menu({ label, ariaLabel, className, items }: { label: ReactNode; ariaLabel?: string; className?: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className={`btn ${className ?? ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
      >
        {label}
      </button>
      {open ? (
        <div className="menu-list" role="menu">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`menu-item${item.danger ? ' danger' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Dots() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function AppBar() {
  const store = useAppStore();
  const { workspace } = store;
  const score = validation(workspace.state, workspace.products, workspace.sublicenses, workspace.statementType).score;

  function exportJson() {
    const doc = currentDocument(workspace);
    const extras = {
      totals: computeTotals(doc.state, doc.products, workspace.statementType),
      validation: validation(doc.state, doc.products, doc.sublicenses, workspace.statementType),
      calculationWarnings: calculationWarnings(doc.state, doc.products, doc.reserves, doc.sublicenses),
    };
    downloadFile(
      statementFilename(doc.state, 'json'),
      'application/json',
      JSON.stringify(serializeDocument(doc, extras), null, 2),
    );
  }

  function exportCsv() {
    const doc = currentDocument(workspace);
    downloadFile(statementFilename(doc.state, 'csv'), 'text/csv;charset=utf-8', serializeStatementCsv(doc));
  }

  function clearAll() {
    // Confirm-on-clear is a v1 SHOULD (PR 19); custom profiles survive regardless.
    if (window.confirm('Clear all statement fields? Custom import profiles are kept.')) {
      store.clearAll();
    }
  }

  return (
    <header className="appbar no-print">
      <div className="appbar-inner">
        <div className="brand">
          <h1 className="app-title">
            <img className="brand-logo" src={LOGO_SRC} alt="CLEAR" />
            Statement Builder
          </h1>
          <span className="version-badge">{APP_VERSION}</span>
        </div>
        <div className="seg-toggle" role="group" aria-label="Statement type">
          {STATEMENT_TYPES.map(([type, label]) => (
            <button
              key={type}
              type="button"
              className={`seg-btn${workspace.statementType === type ? ' active' : ''}`}
              aria-pressed={workspace.statementType === type}
              onClick={() => store.setStatementType(type)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="appbar-buttons">
          <button
            type="button"
            className="completeness"
            aria-label={`Completeness ${score}%, open validation`}
            title="Required-field completeness — open Validation"
            onClick={() => store.setSection('Validation')}
          >
            <span>Completeness</span>
            <span className="completeness-track" aria-hidden="true">
              <span className="completeness-bar" style={{ width: `${score}%` }} />
            </span>
            <span className="completeness-value" aria-hidden="true">{score}%</span>
          </button>
          <button type="button" className="btn" onClick={() => store.setSection('Import / digest')}>
            Import
          </button>
          <button type="button" className="btn" onClick={() => store.setSection('Review my statement')}>
            Review
          </button>
          <Menu
            label={
              <>
                Export <Chevron />
              </>
            }
            items={[
              { label: 'Export JSON', onSelect: exportJson },
              { label: 'Export CSV', onSelect: exportCsv },
            ]}
          />
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Print
          </button>
          <Menu
            label={<Dots />}
            ariaLabel="More actions"
            className="btn-icon"
            items={[
              { label: 'Load sample', onSelect: () => store.loadSample() },
              { label: 'Clear all fields', onSelect: clearAll, danger: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
