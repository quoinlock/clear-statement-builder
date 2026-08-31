import { totals as computeTotals, calculationWarnings } from '../../core/calc/index.ts';
import { validation } from '../../core/validation/index.ts';
import {
  serializeDocument,
  serializeStatementCsv,
  statementFilename,
} from '../../core/schema/index.ts';
import type { StatementDocument } from '../../core/types.ts';
import { useAppStore } from './store.tsx';
import { downloadFile } from './download.ts';

export const APP_VERSION = 'v1.0.0';

function currentDocument(ws: ReturnType<typeof useAppStore>['workspace']): StatementDocument {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    product: 'clear-statement-builder',
    priorArt: 'hugo-prototype-v1.7',
    state: ws.state,
    products: ws.products,
    reserves: ws.reserves,
    sublicenses: ws.sublicenses,
  };
}

export function AppBar() {
  const store = useAppStore();
  const { workspace } = store;

  function exportJson() {
    const doc = currentDocument(workspace);
    const extras = {
      totals: computeTotals(doc.state, doc.products),
      validation: validation(doc.state, doc.products, doc.sublicenses),
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

  return (
    <header className="appbar no-print">
      <div className="appbar-inner">
        <h1 className="app-title">Clear Statement Builder</h1>
        <span className="version-badge">{APP_VERSION}</span>
        <div className="appbar-buttons">
          <button type="button" className="btn btn-danger" onClick={() => store.clearAll()}>
            Clear all fields
          </button>
          <button type="button" className="btn" onClick={() => store.loadSample()}>
            Load sample
          </button>
          <button type="button" className="btn btn-green" onClick={exportJson}>
            Export JSON
          </button>
          <button type="button" className="btn btn-amber" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn" onClick={() => store.setSection('Import / digest')}>
            Import
          </button>
          <button type="button" className="btn btn-teal" onClick={() => store.setSection('Review my statement')}>
            Review
          </button>
          <button type="button" className="btn" onClick={() => document.dispatchEvent(new CustomEvent('csb:open-help'))}>
            Help
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <p className="app-subtitle">
          BISG-aligned translation-rights royalty statements — validation, import profiles, Ullstein contract
          splitting, review reports, and exports. Prior art: Hugo prototype.
        </p>
      </div>
    </header>
  );
}
