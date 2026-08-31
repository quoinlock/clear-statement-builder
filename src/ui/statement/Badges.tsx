// Category + BISG-ID badges (Hugo metaBadge parity): only catalog keys get
// badges — Hugo-extended keys like basisAmount/name/withheld render none.
import { fieldMeta } from '../../core/catalog/fieldMeta.ts';

export function MetaBadges({ fieldKey }: { fieldKey: string }) {
  const meta = fieldMeta(fieldKey);
  if (!meta) return null;
  const [id, category] = meta;
  return (
    <>
      <span className={`badge ${category.toLowerCase().split(' ')[0]}`}>{category}</span>{' '}
      <span className="badge idbadge">{id}</span>
    </>
  );
}
