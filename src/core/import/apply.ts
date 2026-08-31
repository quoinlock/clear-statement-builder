// Review-before-apply (PRD Key Decision 4). Pure functions mapping a
// reviewed DetectionResult onto a workspace. Hugo parity rules:
// - state copy is whitelisted to keys already on StatementState and
//   non-blank values only;
// - applying a contract statement REPLACES products and leaves
//   reserves/sublicenses untouched;
// - bulk Apply refuses when more than one contract statement was detected
//   (AC-IMP-4), and uses the single contract when exactly one exists.
import { fieldMeta } from '../catalog/fieldMeta.ts';
import { STATEMENT_STATE_KEYS } from '../catalog/groups.ts';
import { notBlank } from '../calc/index.ts';
import type {
  ContractStatement,
  DetectionResult,
  ProductRow,
  ReserveRow,
  StatementState,
  SublicenseRow,
} from '../types.ts';

export interface ApplyTarget {
  state: StatementState;
  products: ProductRow[];
  reserves: ReserveRow[];
  sublicenses: SublicenseRow[];
}

export type ApplyOutcome =
  | { kind: 'applied'; target: ApplyTarget; message: string }
  | { kind: 'refused'; reason: 'nothing' | 'multiple-contracts'; message: string };

const STATE_KEY_SET = new Set<string>(STATEMENT_STATE_KEYS);

function mergeState(state: StatementState, incoming: Partial<StatementState> | undefined): StatementState {
  const next = { ...state };
  for (const [k, v] of Object.entries(incoming ?? {})) {
    if (STATE_KEY_SET.has(k) && notBlank(v)) next[k as keyof StatementState] = String(v);
  }
  return next;
}

function fullProductRow(p: Partial<ProductRow>): ProductRow {
  return {
    form: '',
    isbn: '',
    pubDate: '',
    listPrice: '',
    basis: '',
    rate: '',
    priorUnits: '',
    periodUnits: '',
    basisAmount: '',
    earnings: '',
    ...p,
  };
}

export function applyContractStatement(target: ApplyTarget, cs: ContractStatement): ApplyTarget {
  return {
    state: mergeState(target.state, cs.state),
    products: (cs.products ?? []).map(fullProductRow),
    reserves: target.reserves,
    sublicenses: target.sublicenses,
  };
}

export function applyDetectionResult(target: ApplyTarget, d: DetectionResult | null): ApplyOutcome {
  if (!d) {
    return { kind: 'refused', reason: 'nothing', message: 'Nothing to apply — import or digest a statement first.' };
  }
  const contracts = d.contractStatements ?? [];
  if (contracts.length > 1) {
    return {
      kind: 'refused',
      reason: 'multiple-contracts',
      message:
        'Multiple contract statements detected. Use “Apply this statement” in the contract table to import one internal contract number at a time.',
    };
  }
  if (contracts.length === 1) {
    return {
      kind: 'applied',
      target: applyContractStatement(target, contracts[0]),
      message: `Contract ${contracts[0].contractId} has been copied in as one separate statement. Review validation and calculation warnings, then export if needed.`,
    };
  }
  const next: ApplyTarget = {
    state: mergeState(target.state, d.state),
    products: d.products.length ? d.products.map(fullProductRow) : target.products,
    reserves: d.reserves.length ? d.reserves : target.reserves,
    sublicenses: d.sublicenses.length ? d.sublicenses : target.sublicenses,
  };
  return {
    kind: 'applied',
    target: next,
    message: 'Reviewed values have been copied into the statement. Review validation and calculation warnings.',
  };
}

/** Manual mapping of an unmapped line: Low confidence, removes the line. */
export function mapUnmappedLine(d: DetectionResult, lineIdx: number, field: string): DetectionResult {
  const line = d.unmappedLines[lineIdx];
  if (!field || !line) return d;
  return {
    ...d,
    state: { ...d.state, [field]: line },
    detections: [
      ...d.detections,
      {
        target: field,
        value: line,
        confidence: 'Low',
        source: 'Manual mapping',
        reason: 'Mapped by user from unmapped text line',
        bisg: fieldMeta(field)?.[0] ?? '',
        category: fieldMeta(field)?.[1] ?? '',
      },
    ],
    unmappedLines: d.unmappedLines.filter((_, i) => i !== lineIdx),
  };
}
