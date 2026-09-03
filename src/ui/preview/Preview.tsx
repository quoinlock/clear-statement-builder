// Live two-page A4 preview. Markup structure follows the Hugo v1.7
// renderPreview (snapshot-normative); copy follows the PRD F4 rebrand
// contract: the subtitle is the non-certification string, and the
// explanatory note has sample vs user-data variants. All values render as
// React text nodes (no innerHTML of user/imported strings).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ltdUnits, money, num, totals } from '../../core/calc/index.ts';
import { bisgId } from '../../core/catalog/fieldMeta.ts';
import { standardName, statementSubtitle, statementTitle } from '../../core/catalog/applicability.ts';
import { LOGO_SRC, TAGLINE } from '../brand.ts';
import { sample } from '../../core/sample/index.ts';
import { useAppStore } from '../app/store.tsx';
import type { StatementType } from '../../core/types.ts';

const PAGE_WIDTH = 794;

function Fid({ k, on }: { k: string; on: boolean }) {
  if (!on) return null;
  const id = bisgId(k);
  return id ? <span className="fid">{id}</span> : null;
}

function Line({ label, value, k, on }: { label: string; value: ReactNode; k?: string; on?: boolean }) {
  return (
    <div className="line">
      <b>
        {label}
        {k ? <Fid k={k} on={on ?? false} /> : null}
      </b>
      <span>{value}</span>
    </div>
  );
}

function Sect({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="section-title">
      <div className="icon">{icon}</div>
      <h2>{title}</h2>
    </div>
  );
}

function PageHeader({ n, statementNo, type }: { n: number; statementNo: string; type: StatementType }) {
  return (
    <header className="doc-header">
      <div>
        <h1>{statementTitle(type)}</h1>
        <p className="doc-subtitle">{statementSubtitle(type)}</p>
      </div>
      <div className="doc-meta">
        <div>Statement No. {statementNo}</div>
        <div>Page {n} of 2</div>
      </div>
    </header>
  );
}

function PageFooter({
  n,
  preparedBy,
  licenseeName,
  type,
}: {
  n: number;
  preparedBy: string;
  licenseeName: string;
  type: StatementType;
}) {
  return (
    <footer className="footer">
      <div className="footer-row">
        <span>Prepared by {n === 2 ? preparedBy : 'Rights & Royalties Department'}</span>
        <span>{licenseeName}</span>
      </div>
      <div className="footer-brand">
        <img className="footer-logo" src={LOGO_SRC} alt="CLEAR" />
        <div>
          <div className="footer-brand-line">
            <b>This is a CLEAR Statement</b> — prepared in accordance with the {standardName(type)}.
          </div>
          <div className="footer-tagline">{TAGLINE}</div>
        </div>
      </div>
    </footer>
  );
}

export function Preview() {
  const { workspace } = useAppStore();
  const { state, products, reserves, sublicenses, showIds, statementType } = workspace;
  const translation = statementType === 'translation';
  const t = totals(state, products, statementType);
  const isSampleData = useMemo(() => JSON.stringify(state) === JSON.stringify(sample), [state]);

  // Layout A: "Fit" scales the A4 pages to the column width (CSS zoom, reset
  // for print); "100%" shows them at true size with horizontal scroll.
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [fitScale, setFitScale] = useState(1);
  const pagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pagesRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? PAGE_WIDTH;
      setFitScale(Math.min(1, Math.max(0.4, width / PAGE_WIDTH)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const zoom = zoomMode === 'fit' ? fitScale : 1;

  return (
    <main className="preview-wrap" aria-label="Statement preview">
      <div className="preview-toolbar no-print">
        <span className="preview-title">Live preview</span>
        <span>2 pages · A4</span>
        <div className="preview-zoom" role="group" aria-label="Preview zoom">
          <button type="button" className={`btn small${zoomMode === 'fit' ? ' active' : ''}`} aria-pressed={zoomMode === 'fit'} onClick={() => setZoomMode('fit')}>
            Fit
          </button>
          <button type="button" className={`btn small${zoomMode === 'full' ? ' active' : ''}`} aria-pressed={zoomMode === 'full'} onClick={() => setZoomMode('full')}>
            100%
          </button>
        </div>
      </div>
      <div className="preview-pages" ref={pagesRef} style={{ zoom }}>
      <div className="page">
        <PageHeader n={1} statementNo={state.statementNo} type={statementType} />
        <section className="notes">
          <b>Explanatory note:</b>{' '}
          {isSampleData
            ? 'This fictional sample was generated with CLEAR Statement Builder (prior art: Hugo prototype v1.7) to show a fully populated BISG-style royalty statement. It is not legal, accounting, or tax advice. This is not BISG certification or approval.'
            : 'Generated with CLEAR Statement Builder. It is not legal, accounting, or tax advice. This is not BISG certification or approval.'}
        </section>
        <div className="block two-col">
          <div className="col-divider">
            <div className="dark-title">◎ Licensee</div>
            <div className="contact">
              <Line label="Licensee Name:" value={state.licenseeName} k="licenseeName" on={showIds} />
              <Line label="Licensee Imprint:" value={state.licenseeImprint} k="licenseeImprint" on={showIds} />
              <Line label="Contact Information:" value={state.licenseeAddress} k="licenseeAddress" on={showIds} />
              <Line label="Phone:" value={state.licenseePhone} />
              <Line label="Email:" value={state.licenseeEmail} />
              <Line label="Website:" value={state.licenseeWebsite} />
            </div>
          </div>
          <div>
            <div className="dark-title">▣ Payer (if different from Licensee)</div>
            <div className="contact">
              <Line label="Payer Name:" value={state.payerName} k="payerName" on={showIds} />
              <Line label="Contact Information:" value={state.payerAddress} k="payerAddress" on={showIds} />
              <Line label="Phone:" value={state.payerPhone} />
              <Line label="Email:" value={state.payerEmail} />
              <Line label="Website:" value={state.payerWebsite} />
            </div>
          </div>
        </div>
        <section className="block pad">
          <Sect icon="▤" title="Contract and Work Information" />
          <div className="info-grid">
            <div>
              <Line label="Licensee Contract ID:" value={state.licenseeContractId} k="licenseeContractId" on={showIds} />
              <Line label="Licensor Name:" value={state.licensorName} k="licensorName" on={showIds} />
              <Line label="Licensor Contract ID:" value={state.licensorContractId} k="licensorContractId" on={showIds} />
              <Line label="Contributor Name(s):" value={state.contributorNames} k="contributorNames" on={showIds} />
              <Line
                label={translation ? 'Licensor Title of Work:' : 'Title of Work:'}
                value={<em>{state.licensorTitle}</em>}
                k="licensorTitle"
                on={showIds}
              />
              {translation ? (
                <Line label="Licensee Title of Work:" value={<em>{state.licenseeTitle}</em>} k="licenseeTitle" on={showIds} />
              ) : null}
            </div>
            <div>
              {translation ? (
                <>
                  <Line label="Language:" value={state.language} k="language" on={showIds} />
                  <Line label="Sales Territory:" value={state.salesTerritory} k="salesTerritory" on={showIds} />
                </>
              ) : null}
              <Line
                label="Advance Amount:"
                value={Number(state.advanceAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                k="advanceAmount"
                on={showIds}
              />
              {translation ? (
                <Line label="Advance Currency:" value={state.advanceCurrency} k="advanceCurrency" on={showIds} />
              ) : null}
              <Line label="Statement Date:" value={state.statementDate} k="statementDate" on={showIds} />
              <Line label="Period Start Date:" value={state.periodStart} k="periodStart" on={showIds} />
              <Line label="Period End Date:" value={state.periodEnd} k="periodEnd" on={showIds} />
            </div>
          </div>
        </section>
        <section className="block pad borderless">
          <Sect icon="▥" title="Sales and Royalty Detail by Product Form" />
          <table className="tbl">
            <thead>
              <tr>
                {['Product Form Detail', 'ISBN', 'Publication Date', 'List Price', 'Royalty Basis', 'Rate', 'Prior Units', 'Period Units', 'LTD Units', 'Basis Amount', 'Royalty Earnings'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i}>
                  <td>
                    <b>{p.form}</b>
                    <Fid k="form" on={showIds} />
                  </td>
                  <td>
                    {p.isbn}
                    <Fid k="isbn" on={showIds} />
                  </td>
                  <td>
                    {p.pubDate}
                    <Fid k="pubDate" on={showIds} />
                  </td>
                  <td className="right">
                    {money(p.listPrice)}
                    <Fid k="listPrice" on={showIds} />
                  </td>
                  <td>
                    {p.basis}
                    <Fid k="basis" on={showIds} />
                  </td>
                  <td className="right">
                    {p.rate}%
                    <Fid k="rate" on={showIds} />
                  </td>
                  <td className="right">
                    {num(p.priorUnits)}
                    <Fid k="priorUnits" on={showIds} />
                  </td>
                  <td className="right">
                    {num(p.periodUnits)}
                    <Fid k="periodUnits" on={showIds} />
                  </td>
                  <td className="right">
                    {num(ltdUnits(p))}
                    <Fid k="ltdUnits" on={showIds} />
                  </td>
                  <td className="right">{p.basisAmount}</td>
                  <td className="right">
                    <b>{money(p.earnings)}</b>
                    <Fid k="earnings" on={showIds} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="summary">
            Total Royalty Earnings: {money(t.totalRoyalty)} {showIds ? <span className="fid-summary">SS67_TotRoyEarnings</span> : null}
          </div>
        </section>
        <section className="notes">
          <Sect icon="ƒ" title="Formula Transparency" />
          <ul>
            <li>
              <span className="formula">Life to Date Units = Prior Units + Period Units</span>
            </li>
            <li>
              <span className="formula">Royalty Earnings = Royalty Rate × Royalty Basis Amount</span>
            </li>
            <li>
              <span className="formula">Total Royalty Earnings = Sum of Royalty Earnings across product forms</span>
            </li>
            <li>
              For list-price rows, the basis amount is usually list price per copy. For net-receipts rows, the basis
              amount is total net receipts for the period.
            </li>
          </ul>
        </section>
        <PageFooter n={1} preparedBy={state.preparedBy} licenseeName={state.licenseeName} type={statementType} />
      </div>
      <div className="page">
        <PageHeader n={2} statementNo={state.statementNo} type={statementType} />
        <section className="block pad">
          <Sect icon="⚖" title="Balance Reconciliation" />
          <table className="tbl smalltbl narrow">
            <thead>
              <tr>
                <th className="left">Field</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Opening Balance (unearned advance carried forward)', money(t.opening), 'openingBalance'],
                  ['Total Royalty Earnings', money(t.totalRoyalty), 'totalRoyalty'],
                  ['Reserve Withheld this Period', money(-t.withheld), 'reserveWithheld'],
                  ['Reserve Released this Period', money(t.released), 'reserveReleased'],
                  ['Licensor Amount of Sublicense Income', money(t.sub), 'licensorAmountDue'],
                  ['Closing Balance', money(t.closing), 'closingBalance'],
                ] as const
              ).map(([label, amount, k]) => (
                <tr key={label}>
                  <td>
                    <b>
                      {label}
                      <Fid k={k} on={showIds} />
                    </b>
                  </td>
                  <td className="right">{amount}</td>
                </tr>
              ))}
              <tr className="teal-row">
                <td>
                  Payment Due (EARNED)
                  <Fid k="paymentDue" on={showIds} />
                </td>
                <td className="right">{money(t.payment)}</td>
              </tr>
            </tbody>
          </table>
          <p className="note-small narrow">
            <span className="formula">
              Closing Balance = Total Royalty Earnings − Reserve Withheld + Reserve Released + Sublicense Income
            </span>
            <br />
            <span className="formula">Payment Due = Opening Balance + Closing Balance</span>
          </p>
        </section>
        <section className="block pad">
          <Sect icon="◔" title="Reserve Detail" />
          <table className="tbl smalltbl narrow">
            <thead>
              <tr>
                {['Product Form Detail', 'Reserve Rate', 'Reserve Withheld', 'Reserve Released'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reserves.map((r, i) => (
                <tr key={i}>
                  <td>{r.form}</td>
                  <td>{r.rate}</td>
                  <td className="right">{money(r.withheld)}</td>
                  <td className="right">{money(r.released)}</td>
                </tr>
              ))}
              <tr className="teal-row">
                <td>Total</td>
                <td className="center">—</td>
                <td className="right">{money(t.withheld)}</td>
                <td className="right">{money(t.released)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section className="block pad">
          <Sect icon="▤" title="Sublicense Income" />
          <table className="tbl smalltbl">
            <thead>
              <tr>
                {['Sublicensee Name', 'Sublicense Type', 'Sublicense Income', 'Licensor Share', 'Licensor Amount Due'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sublicenses.map((s, i) => (
                <tr key={i}>
                  <td>
                    {s.name}
                    <Fid k="sublicenseeName" on={showIds} />
                  </td>
                  <td>
                    {s.type}
                    <Fid k="sublicenseType" on={showIds} />
                  </td>
                  <td className="right">
                    {money(s.income)}
                    <Fid k="sublicenseIncome" on={showIds} />
                  </td>
                  <td className="right">
                    {s.share}%
                    <Fid k="licensorShare" on={showIds} />
                  </td>
                  <td className="right">
                    {money(s.amountDue)}
                    <Fid k="licensorAmountDue" on={showIds} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note-small indent">
            <em>If no sublicense income applies, enter 0.00 and state “not applicable.”</em>
          </p>
        </section>
        <section className="block pad">
          <Sect icon="▥" title="Remittance Advice and Tax Information" />
          <div className="remit-grid">
            <div>
              <Line
                label="Remit ID Information:"
                value={
                  <>
                    {state.licensorContractId} | {state.contributorNames.split(' (')[0]} |{' '}
                    <em>{state.licensorTitle}</em> | {state.statementNo}
                  </>
                }
                k="remitId"
                on={showIds}
              />
              {translation ? (
                <>
                  <Line label="Co-Agent Commission %:" value={`${state.coAgentCommissionPercent}%`} k="coAgentCommissionPercent" on={showIds} />
                  <Line label="Co-Agent Commission:" value={money(-t.commission)} k="coAgentCommissionPercent" on={showIds} />
                </>
              ) : null}
              <Line label="Licensee VAT / Tax ID:" value={state.taxId} k="taxId" on={showIds} />
              <Line label="Tax Exemption Status:" value={state.taxExemptionStatus} k="taxExemptionStatus" on={showIds} />
              <Line label="Tax Withheld Amount:" value={money(state.taxWithheld)} k="taxWithheld" on={showIds} />
              <Line label="Net Amount Remitted:" value={money(t.net)} />
            </div>
            <div>
              <Line label="Scheduled Payment Date:" value={state.scheduledPaymentDate} />
              <Line label="Payment Method:" value={state.paymentMethod} />
              <Line label="Beneficiary:" value={state.beneficiary} />
              <Line label="Beneficiary Bank:" value={state.beneficiaryBank} />
              <Line label="SWIFT / BIC:" value={state.swiftBic} />
              <Line label="Account Reference:" value={state.accountReference} />
            </div>
          </div>
        </section>
        <section className="notes">
          <Sect icon="•" title="Statement Notes" />
          <ul>
            {state.statementNotes
              .split('\n')
              .filter(Boolean)
              .map((n, i) => (
                <li key={i}>{n}</li>
              ))}
          </ul>
        </section>
        <PageFooter n={2} preparedBy={state.preparedBy} licenseeName={state.licenseeName} type={statementType} />
      </div>
      </div>
    </main>
  );
}
