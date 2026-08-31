// Ullstein/Bonnier multi-contract split (Hugo parseUllsteinContracts
// parity; snapshot-normative). Seven steps: marker detection (inline
// "Interne VertragsNr. NNN" or a bare label with a 6+-digit neighbour),
// segmenting from marker-10 to the next marker, a 12-line title walk-back
// splitting "Surname, Firstname, Title", product-start detection, per-
// segment parsing, and the three balance lines (Vortrag → opening;
// Verrechenbare Honorare and Neuer Vortrag → statement notes).
import type { ContractStatement, ProductRow, StatementState } from '../types.ts';
import { findValueForLabel, isMoneyLikeLine, parseGermanNumber } from './helpers.ts';
import { parseUllsteinProductSegment } from './productSegment.ts';

interface Marker {
  idx: number;
  contractId: string;
}

export function findUllsteinContractMarkers(lines: string[]): Marker[] {
  const markers: Marker[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '').trim();
    const m = line.match(/Interne VertragsNr\.?\s*([0-9]+)/i);
    if (m) {
      markers.push({ idx: i, contractId: m[1] });
      continue;
    }
    if (/^Interne VertragsNr\.?$/i.test(line)) {
      let id = '';
      if (i > 0 && /^\d{6,}$/.test(lines[i - 1].trim())) id = lines[i - 1].trim();
      else if (i + 1 < lines.length && /^\d{6,}$/.test(lines[i + 1].trim())) id = lines[i + 1].trim();
      if (id) markers.push({ idx: i, contractId: id });
    }
  }
  return markers;
}

export function findContractTitle(lines: string[], markerIdx: number): string {
  for (let i = markerIdx - 1; i >= Math.max(0, markerIdx - 12); i--) {
    const l = String(lines[i] || '').trim();
    if (/^[A-ZÄÖÜ][^\n,]+,\s*[^\n,]+,\s*[^\n]+/.test(l)) return l;
  }
  return '';
}

function euro(n: string): string {
  return '€' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export function parseUllsteinContracts(text: string, baseState: Partial<StatementState>): ContractStatement[] {
  const lines = text
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);
  const markers = findUllsteinContractMarkers(lines);
  if (!markers.length) return [];
  const contracts: ContractStatement[] = [];
  for (let mi = 0; mi < markers.length; mi++) {
    const marker = markers[mi];
    const nextIdx = mi + 1 < markers.length ? markers[mi + 1].idx : lines.length;
    const start = Math.max(0, marker.idx - 10);
    const segLines = lines.slice(start, nextIdx);
    const seg = segLines.join('\n');
    const title = findContractTitle(lines, marker.idx);
    const st: Partial<StatementState> = Object.assign({}, baseState || {});
    st.licenseeContractId = marker.contractId;
    if (title) {
      const parts = title.split(',').map(x => x.trim());
      if (parts.length >= 2) st.contributorNames = `${parts[0]}, ${parts[1]}`;
      if (parts.length >= 3) st.licenseeTitle = parts.slice(2).join(', ');
      else st.licenseeTitle = title;
    }
    const productStarts: number[] = [];
    for (let i = 0; i < segLines.length; i++) {
      const l = segLines[i];
      if (
        /^(TB|Taschenbuch|E-?Book|Standard E-?Book|Hardcover|Paperback)(\s+97[89][\d\- ]{10,17})?$/i.test(l) ||
        /^(TB|Taschenbuch|E-?Book|Standard E-?Book|Hardcover|Paperback)\s+97[89]/i.test(l)
      ) {
        productStarts.push(i);
      }
    }
    const products: ProductRow[] = [];
    for (let pi = 0; pi < productStarts.length; pi++) {
      const ps = productStarts[pi];
      const pe = pi + 1 < productStarts.length ? productStarts[pi + 1] : segLines.length;
      const pseg = segLines.slice(ps, pe).join('\n');
      const p = parseUllsteinProductSegment(pseg, title);
      if (p.isbn || p.form) products.push(p);
      if (!st.periodStart && p.periodStart) st.periodStart = p.periodStart;
      if (!st.periodEnd && p.periodEnd) st.periodEnd = p.periodEnd;
    }
    const balanceLines = lines.slice(marker.idx, nextIdx);
    const opening = parseGermanNumber(
      findValueForLabel(balanceLines, /Vortrag lt\. letzter Abrechnung(?:\s+([-+]?\d[\d.]*,\d{2}))?/i, isMoneyLikeLine),
    );
    const current = parseGermanNumber(
      findValueForLabel(balanceLines, /Verrechenbare Honorare lt\. Abrechnung(?:\s+([-+]?\d[\d.]*,\d{2}))?/i, isMoneyLikeLine),
    );
    const newBal = parseGermanNumber(
      findValueForLabel(balanceLines, /Neuer Vortrag(?:\s+([-+]?\d[\d.]*,\d{2}))?/i, isMoneyLikeLine),
    );
    if (opening) st.openingBalance = opening;
    const notes: string[] = [];
    if (current) notes.push(`Ullstein current-period verrechenbare Honorare: ${euro(current)}.`);
    if (newBal) notes.push(`Ullstein Neuer Vortrag / new carried-forward balance: ${euro(newBal)}.`);
    if (notes.length) st.statementNotes = (st.statementNotes ? st.statementNotes + '\n' : '') + notes.join('\n');
    contracts.push({
      contractId: marker.contractId,
      title: st.licenseeTitle || title || `Contract ${marker.contractId}`,
      state: st,
      products,
      sourceText: seg,
      openingBalance: opening,
      currentRoyalty: current,
      newBalance: newBal,
    });
  }
  return contracts;
}
