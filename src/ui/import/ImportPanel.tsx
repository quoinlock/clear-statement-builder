// F6: import / digest panel. Profile select (Auto / Ullstein-Bonnier /
// Generic / Custom: {name}), file input (.json,.csv,.txt,.pdf), paste box,
// review pane (pills, notes, contract table with per-row Apply, detected
// fields, product table capped at 24 rows, calc inferences, unmapped-line
// mapper), and the Apply/Clear actions. Nothing touches the statement until
// the user applies (AC-IMP-15).
import { useRef, useState } from 'react';
import { digestStatementText } from '../../core/import/digest.ts';
import { jsonToDetectionResult, parseImportedCsv } from '../../core/import/structured.ts';
import {
  applyContractStatement,
  applyDetectionResult,
  mapUnmappedLine,
} from '../../core/import/apply.ts';
import { IMPORT_FIELD_OPTIONS } from '../../core/import/helpers.ts';
import { bisgId } from '../../core/catalog/fieldMeta.ts';
import { extractPdfText } from '../../pdf/extractText.ts';
import { useAppStore } from '../app/store.tsx';
import type { Confidence, DetectionResult } from '../../core/types.ts';

function ConfidencePill({ value }: { value: Confidence | '' }) {
  const cls = value === 'High' ? 'good' : value === 'Medium' ? 'warn' : 'bad';
  return <span className={`pill ${cls}`}>{value || 'Medium'}</span>;
}

export function ImportPanel() {
  const store = useAppStore();
  const d = store.detectedImport;
  const [profile, setProfile] = useState('auto');
  const [pasted, setPasted] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [mapLine, setMapLine] = useState(0);
  const [mapField, setMapField] = useState<string>(IMPORT_FIELD_OPTIONS[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  function digest(text: string) {
    setStatus(null);
    store.setDetectedImport(digestStatementText(text, profile, store.customProfiles));
  }

  async function readFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus('No file chosen. Choose a JSON, CSV, TXT, or text-based PDF file.');
      return;
    }
    setStatus(`Processing ${file.name} ...`);
    try {
      const name = file.name.toLowerCase();
      let parsed: DetectionResult;
      if (name.endsWith('.json')) {
        parsed = jsonToDetectionResult(JSON.parse(await file.text()));
      } else if (name.endsWith('.csv')) {
        parsed = parseImportedCsv(await file.text());
      } else if (name.endsWith('.pdf')) {
        const txt = await extractPdfText(await file.arrayBuffer());
        setPasted(txt);
        parsed = digestStatementText(txt, profile, store.customProfiles);
      } else {
        const txt = await file.text();
        setPasted(txt);
        parsed = digestStatementText(txt, profile, store.customProfiles);
      }
      store.setDetectedImport(parsed);
      setStatus(null);
    } catch (e) {
      setStatus(`Import error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function applyAll() {
    const outcome = applyDetectionResult(store.workspace, d);
    if (outcome.kind === 'applied') {
      // A statement JSON import carries its statement type (Hugo/CSB 1.0.x
      // files read as 'translation'); applying the import adopts it. Text,
      // PDF, and CSV imports leave the current mode alone.
      store.replaceWorkspace({
        ...store.workspace,
        ...outcome.target,
        ...(d?.statementType ? { statementType: d.statementType } : {}),
      });
    }
    setStatus(outcome.message);
  }

  function applyContract(i: number) {
    if (!d?.contractStatements?.[i]) return;
    const cs = d.contractStatements[i];
    store.replaceWorkspace({ ...store.workspace, ...applyContractStatement(store.workspace, cs) });
    setStatus(
      `Contract ${cs.contractId} has been copied in as one separate statement. Review validation and calculation warnings, then export if needed.`,
    );
  }

  function clearImport() {
    store.setDetectedImport(null);
    setPasted('');
    setStatus(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function mapSelected() {
    if (!d) return;
    store.setDetectedImport(mapUnmappedLine(d, mapLine, mapField));
    setMapLine(0);
  }

  const fields = Object.entries(d?.state ?? {});

  return (
    <>
      <h2>Import / digest</h2>
      <p className="panel-sub">
        Deterministic, on-device import: PDF text, TXT, pasted text, JSON, or CSV. Detected values are staged
        here for review — nothing changes the statement until you apply it.
      </p>
      <div className="field">
        <label>
          Import profile
          <select value={profile} onChange={e => setProfile(e.target.value)}>
            <option value="auto">Auto-detect</option>
            <option value="ullstein">Ullstein / Bonnier Germany</option>
            <option value="generic">Generic</option>
            {store.customProfiles.map(p => (
              <option key={p.id} value={`custom:${p.id}`}>
                Custom: {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        <label>
          Statement file
          <input ref={fileRef} type="file" accept=".json,.csv,.txt,.pdf" />
        </label>
      </div>
      <div className="field">
        <label>
          Or paste statement text
          <textarea rows={6} value={pasted} onChange={e => setPasted(e.target.value)} />
        </label>
      </div>
      <div className="appbar-buttons" style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" onClick={readFile}>
          Read file
        </button>
        <button type="button" className="btn" onClick={() => digest(pasted)}>
          Digest pasted text
        </button>
        <button type="button" className="btn btn-green" onClick={applyAll}>
          Apply to statement
        </button>
        <button type="button" className="btn" onClick={clearImport}>
          Clear import
        </button>
      </div>
      {status ? (
        <p role="status" className="issue warn" style={{ padding: '8px 12px' }}>
          {status}
        </p>
      ) : null}
      {!d ? (
        <p className="panel-sub">No statement imported yet.</p>
      ) : (
        <div className="import-result">
          <div style={{ marginBottom: 8 }}>
            <span className="pill good">{d.sourceType}</span> <span className="pill warn">Profile: {d.profile || 'generic'}</span>{' '}
            <span className="pill bad">Review before applying</span>
          </div>
          <ul className="panel-sub" style={{ paddingLeft: 18 }}>
            {d.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {d.contractStatements?.length ? (
            <>
              <h4>Detected separate contract statements</h4>
              <p className="panel-sub">
                This Ullstein-style intake was split by <b>Interne VertragsNr.</b> Apply one contract at a time to
                review each as a separate statement.
              </p>
              <table className="import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Internal contract number</th>
                    <th>Detected title</th>
                    <th>Product rows</th>
                    <th>Opening balance</th>
                    <th>Current royalties</th>
                    <th>New carried-forward balance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {d.contractStatements.map((cs, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="mono">{cs.contractId}</td>
                      <td>{cs.title}</td>
                      <td>{cs.products.length}</td>
                      <td>{cs.openingBalance}</td>
                      <td>{cs.currentRoyalty}</td>
                      <td>{cs.newBalance}</td>
                      <td>
                        <button type="button" className="btn small" onClick={() => applyContract(i)}>
                          Apply this statement
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
          <h4>Detected statement fields</h4>
          {fields.length ? (
            <table className="import-table">
              <thead>
                <tr>
                  <th>Detected field</th>
                  <th>Value</th>
                  <th>Confidence</th>
                  <th>BISG ID</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(([k, v]) => {
                  const found =
                    d.detections.find(x => x.target === k && String(x.value) === String(v)) ??
                    d.detections.find(x => x.target === k);
                  return (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{String(v)}</td>
                      <td>
                        <ConfidencePill value={found?.confidence ?? ''} />
                      </td>
                      <td>{bisgId(k)}</td>
                      <td>{found?.reason ?? 'Heuristic detection'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="panel-sub">No statement-level fields detected.</p>
          )}
          <h4>Detected product rows</h4>
          {d.products.length ? (
            <table className="import-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>ISBN</th>
                  <th>Prior units</th>
                  <th>Period units</th>
                  <th>Rate</th>
                  <th>Basis</th>
                  <th>Basis amount</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {d.products.slice(0, 24).map((p, i) => (
                  <tr key={i}>
                    <td>{p.form}</td>
                    <td>{p.isbn}</td>
                    <td>{p.priorUnits}</td>
                    <td>{p.periodUnits}</td>
                    <td>{p.rate}</td>
                    <td>{p.basis}</td>
                    <td>{p.basisAmount}</td>
                    <td>{p.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="panel-sub">No product rows detected.</p>
          )}
          {d.calcInferences.length ? (
            <>
              <h4>Calculation inferences</h4>
              <table className="import-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Inferred calculation</th>
                    <th>Reported</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.calcInferences.map((c, i) => (
                    <tr key={i}>
                      <td>{c.product}</td>
                      <td className="mono">{c.calculation}</td>
                      <td>{c.reported}</td>
                      <td>
                        <span className={`pill ${c.status === 'matches' ? 'good' : 'warn'}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
          {d.unmappedLines.length ? (
            <>
              <h4>Unmapped text lines</h4>
              <p className="panel-sub">
                These lines were not classified. Select a line and map it manually if it contains an important BISG
                field.
              </p>
              <div className="field">
                <label>
                  Unmapped line
                  <select value={mapLine} onChange={e => setMapLine(Number(e.target.value))}>
                    {d.unmappedLines.slice(0, 60).map((l, i) => (
                      <option key={i} value={i}>
                        {l.slice(0, 120)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="field">
                <label>
                  Map to field
                  <select value={mapField} onChange={e => setMapField(e.target.value)}>
                    {IMPORT_FIELD_OPTIONS.map(k => (
                      <option key={k} value={k}>
                        {k} {bisgId(k) ? `— ${bisgId(k)}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="button" className="btn small" onClick={mapSelected}>
                Map selected line
              </button>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
