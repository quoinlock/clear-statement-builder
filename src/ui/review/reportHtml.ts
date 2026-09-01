// Standalone review report document (F8 / Appendix E). Structure follows
// the snapshot's pleasantReviewReportHTML; branding follows the PRD rebrand
// rules (no certification claim). All interpolated values pass through
// esc(), which — unlike Hugo's — also escapes apostrophes (v1 MUST
// XSS improvement).
import type { ReviewDocument, ReviewRow } from '../../core/review/index.ts';

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);
}

function shortText(value: string | undefined, fallback = '—'): string {
  return esc(value || fallback);
}

function pillForStatus(status: string): string {
  if (status === 'Detected') return '<span class="status-pill status-ok">Detected</span>';
  if (status === 'Detected but unclear' || status === 'Needs review')
    return '<span class="status-pill status-warn">Needs review</span>';
  if (status === 'Missing') return '<span class="status-pill status-miss">Missing</span>';
  return `<span class="status-pill">${esc(status)}</span>`;
}

type Col<T> = [header: string, accessor: keyof T | ((row: T) => string)];

function simpleTable<T>(rows: T[], cols: Col<T>[], empty = 'No items detected.'): string {
  if (!rows.length) return `<p class="muted">${esc(empty)}</p>`;
  return `<table class="simple-table"><thead><tr>${cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows
    .map(row => `<tr>${cols.map(c => `<td>${typeof c[1] === 'function' ? c[1](row) : esc(String(row[c[1]] ?? ''))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

// Appendix E CSS contract, on :root tokens, self-contained (no app-stylesheet copy).
const REPORT_CSS = `
:root{--navy:#09264a;--teal:#078b8f;--green:#13795b;--amber:#b7791f;--red:#b42318;--line:#94a3b8;--paper:#fff;--bg:#eef3f7;--text:#102033;--muted:#64748b}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px}
h1,h2{color:var(--navy)}
.muted,.helpnote{color:var(--muted);font-size:12px}
.center{text-align:center}
.report-toolbar{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;background:#fff;border-bottom:1px solid #d5dde7;position:sticky;top:0;z-index:10}
.report-toolbar button{font:inherit;font-weight:800;border-radius:10px;padding:8px 14px;border:1px solid #c7d1df;background:#fff;color:var(--navy);cursor:pointer}
.report-toolbar button.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.report-layout{padding-bottom:40px}
.report-doc{max-width:980px;margin:0 auto;padding:24px}
.report-hero h1{margin:0 0 6px;letter-spacing:-0.02em}
.report-hero p{color:var(--muted);margin:0 0 14px}
.report-note{background:#fff8e6;border:1px solid #f0e0b0;border-left:4px solid var(--amber);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px}
.report-metrics{display:grid;grid-template-columns:180px 1fr;gap:16px;margin-bottom:16px}
.plain-card{background:#fff;border:1px solid #d8e0ea;border-radius:16px;padding:16px}
.plain-card h2{margin:0 0 8px;font-size:16px}
.score-donut{font-size:42px;font-weight:950;color:var(--teal);text-align:center;margin-top:14px}
.lay-summary{line-height:1.5}
.category-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cat-card{border:1px solid #d8e0ea;border-radius:12px;padding:10px}
.cat-card .num{font-size:24px;font-weight:950;color:var(--teal)}
.status-pill{display:inline-block;border-radius:999px;font-size:11px;font-weight:800;padding:2px 9px;background:#eef2f7;color:#475569}
.status-ok{background:#dcfce7;color:#166534}
.status-warn{background:#fef3c7;color:#92400e}
.status-miss{background:#fee2e2;color:#991b1b}
.badge.idbadge{display:inline-block;background:#eef2f7;color:#475569;border-radius:999px;font-size:10px;font-weight:800;padding:1px 7px}
.recommendations{display:flex;flex-direction:column;gap:10px}
.rec-item{display:flex;gap:12px;align-items:flex-start}
.rec-no{flex:0 0 26px;height:26px;border-radius:999px;background:var(--teal);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center}
.simple-table{width:100%;border-collapse:collapse;font-size:12px}
.simple-table th{background:var(--navy);color:#fff;text-align:left;padding:6px 8px}
.simple-table td{border:1px solid #d8e0ea;padding:5px 8px;vertical-align:top}
.appendix{margin-top:16px;background:#fff;border:1px solid #d8e0ea;border-radius:16px;padding:12px 16px}
.appendix summary{font-weight:800;color:var(--navy);cursor:pointer}
@page{size:A4 portrait;margin:12mm}
@media print{.report-toolbar{display:none}body{background:#fff}.appendix{border:0;padding:0}}
`;

export function buildReviewReportHtml(r: ReviewDocument): string {
  const summary =
    r.overallScore >= 85
      ? 'This statement appears to include most BISG-recommended information. Review any remaining recommended or conditional fields before treating it as BISG-aligned.'
      : r.overallScore >= 65
        ? 'This statement is partly aligned with BISG expectations. It already contains useful information, but a publisher should clarify or add several fields so recipients can verify royalties more easily.'
        : 'This statement has significant BISG field gaps. A recipient may find it difficult to verify contract economics, royalty calculations, balances, reserves, tax treatment, or payment reconciliation.';
  const top = r.topRecommendations.slice(0, 6);
  const topHtml = top.length
    ? `<div class="recommendations">${top
        .map(
          (x, i) =>
            `<div class="rec-item"><div class="rec-no">${i + 1}</div><div><b>${esc(x.field)}</b>${x.bisgId ? ` <span class="badge idbadge">${esc(x.bisgId)}</span>` : ''}<br><span>${esc(x.recommendation)}</span>${x.why ? `<div class="helpnote">Why it matters: ${esc(x.why)}</div>` : ''}</div></div>`,
        )
        .join('')}</div>`
    : '<p>No high-priority recommendations were found.</p>';
  const categoryHtml = `<div class="category-grid">${r.categoryScores
    .map(
      c =>
        `<div class="cat-card"><b>${esc(c.category)}</b><div class="num">${c.score}%</div><div class="helpnote">${c.detected} detected · ${c.unclear} unclear · ${c.missing} missing</div></div>`,
    )
    .join('')}</div>`;
  const missingHtml = simpleTable<ReviewRow>(
    r.missingFields,
    [
      ['Priority', 'priority'],
      ['BISG field', x => `${esc(x.label)} ${x.bisgId ? `<span class="badge idbadge">${esc(x.bisgId)}</span>` : ''}`],
      ['Why it matters', 'why'],
      ['Suggested fix', 'recommendation'],
    ],
    'No missing fields were identified by the current review.',
  );
  const unclearHtml = simpleTable<ReviewRow>(
    r.unclearFields,
    [
      ['BISG field', x => `${esc(x.label)} ${x.bisgId ? `<span class="badge idbadge">${esc(x.bisgId)}</span>` : ''}`],
      ['Confidence', 'confidence'],
      ['Suggested clarification', 'recommendation'],
    ],
    'No unclear fields were identified by the current review.',
  );
  const warnHtml = simpleTable(
    r.calculationWarnings,
    [
      ['Check', 'label'],
      ['What the review found', 'detail'],
    ],
    'No calculation warnings were detected by the current checks.',
  );
  const checklistHtml = simpleTable<ReviewRow>(r.fields, [
    ['Status', x => pillForStatus(x.status)],
    ['Priority', 'priority'],
    ['BISG ID', 'bisgId'],
    ['Field', 'label'],
    ['Category', 'category'],
    ['Recommendation', 'recommendation'],
  ]);
  const productsHtml = simpleTable(
    r.products,
    [
      ['Form', 'form'],
      ['ISBN', 'isbn'],
      ['Period units', 'periodUnits'],
      ['Royalty basis', 'basis'],
      ['Rate', 'rate'],
      ['Basis amount', 'basisAmount'],
      ['Earnings', 'earnings'],
    ],
    'No product rows are currently present.',
  );
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BISG Royalty Statement Review Report</title><style>${REPORT_CSS}</style></head><body><div class="report-toolbar"><div><b>Clear Statement Builder Review Report</b><div class="helpnote">Publisher-facing BISG standards-completeness review</div></div><div><button onclick="window.close()">Close</button> <button class="primary" onclick="window.print()">Download / Save as PDF</button></div></div><div class="report-layout"><div class="report-doc"><div class="report-hero"><h1>BISG Royalty Statement Review Report</h1><p>Generated by Clear Statement Builder (prior art: Hugo prototype). This plain-language report shows what was detected, what may be missing, and which improvements would make the statement easier to understand and verify.</p></div><div class="report-note"><b>Important:</b> ${esc(r.disclaimer)} This is not BISG certification or approval.</div><div class="report-metrics"><div class="plain-card"><div class="score-donut">${r.overallScore}%</div><p class="center"><b>Overall BISG completeness</b></p></div><div class="plain-card"><h2>Executive summary</h2><p class="lay-summary">${esc(summary)}</p><p><b>Statement reviewed:</b> ${shortText(r.statement.licenseeContractId || r.statement.statementNo, 'untitled')} — ${shortText(r.statement.licenseeTitle || r.statement.licensorTitle, 'title not detected')}</p><p><b>Reporting period:</b> ${shortText(r.statement.periodStart)} ${r.statement.periodEnd ? '– ' + shortText(r.statement.periodEnd) : ''}</p><p><b>Statement type:</b> ${r.statementType === 'standard' ? 'Standard' : 'Translation'}</p><p><b>Detected import profile:</b> ${shortText(r.profile)}</p></div></div><div class="plain-card"><h2>Top recommended improvements</h2>${topHtml}</div><div class="plain-card" style="margin-top:16px"><h2>Category scores</h2>${categoryHtml}</div><div class="plain-card" style="margin-top:16px"><h2>Missing fields</h2><p class="helpnote">Fields below were not found in the current data. Some may be non-applicable; publishers should either add the information or state “not applicable.”</p>${missingHtml}</div><div class="plain-card" style="margin-top:16px"><h2>Detected but unclear fields</h2><p class="helpnote">These fields appear to be present, but labels, abbreviations, or formatting may make them difficult for recipients to interpret.</p>${unclearHtml}</div><div class="plain-card" style="margin-top:16px"><h2>Calculation review</h2><p class="helpnote">The review checks whether totals and formula relationships appear consistent. These checks do not replace accounting review.</p>${warnHtml}</div><details class="appendix"><summary>Appendix A — Field-by-field BISG checklist</summary>${checklistHtml}</details><details class="appendix"><summary>Appendix B — Extracted/current product data</summary>${productsHtml}</details></div></div></body></html>`;
}
