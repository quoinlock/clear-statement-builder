// Custom import profiles (Hugo v1.7 Profile Builder engine, parity). Rule
// syntax is line-based "pattern => target". Targets outside the 39-key
// IMPORT_FIELD_OPTIONS silently no-op (AC-PRF-7/8: closingBalance /
// paymentDue / statementNo / preparedBy never write state). Custom profiles
// NEVER call parseUllsteinContracts (AC-IMP-14) — splitting happens only via
// the profile's own splitPattern over generic digests.
import type { ContractStatement, CustomImportProfile, DetectionResult } from '../types.ts';
import { notBlank } from '../calc/index.ts';
import {
  IMPORT_FIELD_OPTIONS,
  addDetection,
  detectCurrencyValue,
  normalizeText,
  parseGermanNumber,
} from './helpers.ts';

export interface FieldRule {
  pattern: string;
  target: string;
}

export function parseRuleLines(text: string): FieldRule[] {
  return String(text || '')
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(x => x && !x.startsWith('#'))
    .map(line => {
      const parts = line.split(/\s*=>\s*/);
      if (parts.length < 2) return null;
      return { pattern: parts[0].trim(), target: parts.slice(1).join('=>').trim() };
    })
    .filter((r): r is FieldRule => r !== null);
}

export function parseKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  String(text || '')
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(x => x && !x.startsWith('#'))
    .forEach(line => {
      const parts = line.split(/\s*=>\s*/);
      if (parts.length >= 2) out[parts[0].trim()] = parts.slice(1).join('=>').trim();
    });
  return out;
}

/** Regex with an escaped-literal fallback; null only if even that fails (AC-PRF-6). */
export function makeRegex(pattern: string, flags?: string): RegExp | null {
  try {
    return new RegExp(pattern, flags || 'i');
  } catch {
    try {
      return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags || 'i');
    } catch {
      return null;
    }
  }
}

/** Capture group 1 → same-line remainder → up to 3 following non-empty lines → whole match. */
export function valueFromCustomMatch(text: string, pattern: string): string {
  const re = makeRegex(pattern, 'im');
  if (!re) return '';
  const m = text.match(re);
  if (!m) return '';
  if (m[1]) return m[1].trim();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (makeRegex(pattern, 'i')?.test(lines[i])) {
      const same = lines[i]
        .replace(makeRegex(pattern, 'i')!, '')
        .replace(/^\s*[:\-–—]?\s*/, '')
        .trim();
      if (same) return same;
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const nxt = lines[j].trim();
        if (nxt) return nxt;
      }
    }
  }
  return (m[0] || '').trim();
}

export function normalizeCustomNumber(value: string, profile?: CustomImportProfile): string {
  if (!value) return value;
  if (!profile || profile.numberFormat === 'auto') {
    return parseGermanNumber(value) || detectCurrencyValue(value) || value;
  }
  let s = String(value).replace(/[€$£\s]/g, '');
  if (profile.numberFormat === 'european') s = s.replace(/\./g, '').replace(',', '.');
  if (profile.numberFormat === 'us') s = s.replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? s : value;
}

const NUMERIC_TARGET = /amount|balance|withheld|released|income|tax/i;
const MAPPABLE = new Set<string>(IMPORT_FIELD_OPTIONS);

/** Field rules → state (whitelisted), aliases → product forms (never rows), abbreviations/hint → notes. */
export function applyCustomProfileNoSplit(
  base: DetectionResult,
  text: string,
  profile: CustomImportProfile,
): DetectionResult {
  parseRuleLines(profile.fieldRules).forEach(rule => {
    if (!MAPPABLE.has(rule.target)) return;
    const value = valueFromCustomMatch(text, rule.pattern);
    if (notBlank(value)) {
      const finalValue = NUMERIC_TARGET.test(rule.target) ? normalizeCustomNumber(value, profile) : value;
      (base.state as Record<string, string>)[rule.target] = String(finalValue);
      addDetection(
        base.detections,
        rule.target,
        String(finalValue),
        'High',
        'Custom profile: ' + profile.name,
        `Matched custom rule “${rule.pattern}”.`,
      );
    }
  });
  const aliases = parseKeyValueLines(profile.productAliases);
  if (Object.keys(aliases).length && base.products.length) {
    // Aliases rewrite the form of existing rows; they never create rows.
    base.products = base.products.map(p => ({
      ...p,
      form: aliases[p.form] || aliases[String(p.form || '').toLowerCase()] || p.form,
    }));
  }
  const abbr = parseKeyValueLines(profile.abbreviations);
  const hits = Object.entries(abbr)
    .filter(([a]) => makeRegex('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')?.test(text))
    .map(([a, m]) => `${a} = ${m}`);
  if (hits.length) base.notes.push('Custom abbreviation hits: ' + hits.slice(0, 12).join('; ') + '.');
  if (profile.calculationHint) base.notes.push('Custom calculation hint: ' + profile.calculationHint);
  return base;
}

/** ReDoS guard: cap split matches (PRD security hardening). */
const MAX_SPLIT_MATCHES = 200;

/**
 * The five-step custom execution (Hugo custom digest wrapper): generic
 * digest of the full text → splitPattern slices, each generically digested
 * then rule-applied → whole-text rules → aliases → number normalization.
 */
export function runCustomProfileDigest(
  rawText: string,
  profile: CustomImportProfile,
  genericDigest: (text: string, profile: string) => DetectionResult,
): DetectionResult {
  const text = normalizeText(rawText);
  const base = genericDigest(text, 'generic');
  base.profile = 'custom: ' + profile.name;
  base.notes.unshift('Custom import profile applied: ' + profile.name + '.');
  const split = String(profile.splitPattern || '').trim();
  if (split) {
    const re = makeRegex(split, 'gmi');
    if (re) {
      const matches = [...text.matchAll(re)].slice(0, MAX_SPLIT_MATCHES);
      if (matches.length) {
        const contractStatements: ContractStatement[] = [];
        matches.forEach((m, idx) => {
          const start = m.index || 0;
          const end = idx + 1 < matches.length ? matches[idx + 1].index! : text.length;
          const seg = text.slice(start, end);
          let segBase = genericDigest(seg, 'generic');
          segBase = applyCustomProfileNoSplit(segBase, seg, profile);
          const segState = segBase.state as Record<string, string>;
          const contractId = (m[1] || segState.licenseeContractId || m[0] || '').trim();
          if (contractId) segState.licenseeContractId = contractId;
          contractStatements.push({
            contractId,
            title: segState.licenseeTitle || segState.licensorTitle || '',
            state: segBase.state,
            products: segBase.products,
            openingBalance: segState.openingBalance || '',
            currentRoyalty: segBase.products.reduce((s, p) => s + Number(p.earnings || 0), 0).toFixed(2),
            // Parity: reads state.closingBalance, which the whitelist keeps
            // unwritten — so this stays '' unless a future rule maps it.
            newBalance: segState.closingBalance || '',
          });
        });
        if (contractStatements.length) {
          base.contractStatements = contractStatements;
          base.notes.push(
            `${contractStatements.length} separate statement block${contractStatements.length === 1 ? '' : 's'} detected by custom split rule.`,
          );
          base.products = [];
          contractStatements.forEach(cs => cs.products.forEach(p => base.products.push(p)));
          base.state = Object.assign({}, base.state, contractStatements[0].state);
        }
      }
    }
  }
  const result = applyCustomProfileNoSplit(base, text, profile);
  result.sourceType = 'Text/PDF digest with custom profile';
  return result;
}

export function slugifyProfileName(name: string): string {
  return (
    String(name || 'profile')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'profile'
  );
}

export function newProfileId(name: string): string {
  return slugifyProfileName(name) + '-' + Date.now().toString(36);
}

export const DEFAULT_PROFILE_DRAFT: CustomImportProfile = {
  id: '',
  name: 'New publisher profile',
  language: 'English / German',
  numberFormat: 'auto',
  splitPattern: '',
  fieldRules: '',
  abbreviations: '',
  productAliases: '',
  calculationHint: 'units + rate + basis amount + royalty amount',
};

/** The Ullstein-style template (Appendix C, verbatim from the snapshot). */
export const ULLSTEIN_STYLE_TEMPLATE: CustomImportProfile = {
  id: '',
  name: 'Ullstein-style custom template',
  language: 'German',
  numberFormat: 'european',
  splitPattern: 'Interne VertragsNr\\.?\\s*(\\d+)',
  fieldRules:
    'Datum\\s*:?\\s*([0-9.]+) => statementDate\nAbrechnungszeitraum\\s+([0-9.]+)\\s*- => periodStart\nAbrechnungszeitraum\\s+[0-9.]+\\s*-\\s*([0-9.]+) => periodEnd\nRechtegeber\\s*:?\\s*([^\\n]+) => licensorName\nInterne VertragsNr\\.?\\s*(\\d+) => licenseeContractId\nVortrag lt\\. letzter Abrechnung\\s*([-0-9.,]+) => openingBalance\nNeuer Vortrag\\s*([-0-9.,]+) => closingBalance\nHonorarabrechnung brutto / Auszahlung\\s*([-0-9.,]+) => paymentDue',
  abbreviations:
    'NVE => Nettoverlagserlös / Net Publisher Receipts\nNLP => Nettoladenpreis / Net List Price\nBLP => Bruttoladenpreis / Gross List Price\nET => Erscheinungstermin / Publication Date\nGutschrift => Credit Note',
  productAliases: 'TB => Paperback\nTaschenbuch => Paperback\nStandard E-Book => E-Book',
  calculationHint: 'Ullstein line pattern: units + Honorar % + NVE/NLP/BLP basis amount + Guthaben amount',
};
