// Generic repeater: card per row ("Row N" + Delete), two-column field grid,
// zero rows allowed (parity). Column labels open the field-help dialog;
// helpPrefix namespaces the help key (product/reserve/sublicense share
// bare column keys such as "form" and "rate").
import { repeaterHelpKey, type RepeaterPrefix } from '../../core/catalog/fieldHelp.ts';
import { MetaBadges } from './Badges.tsx';
import { FieldTerm } from './FieldHelp.tsx';

export interface RepeaterColumn<T> {
  key: keyof T & string;
  label: string;
}

export function Repeater<T extends { [K in keyof T]: string }>({
  title,
  subtitle,
  rows,
  columns,
  addLabel,
  helpPrefix,
  onChange,
  onAdd,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  columns: RepeaterColumn<T>[];
  addLabel: string;
  helpPrefix: RepeaterPrefix;
  onChange: (rows: T[]) => void;
  onAdd: () => void;
}) {
  function setCell(i: number, key: keyof T & string, value: string) {
    onChange(rows.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  function deleteRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <h2>{title}</h2>
      <p className="panel-sub">{subtitle}</p>
      {rows.map((row, i) => (
        <div className="row-card" key={i}>
          <div className="row-head">
            <span>Row {i + 1}</span>
            <button type="button" className="btn btn-danger small" onClick={() => deleteRow(i)}>
              Delete
            </button>
          </div>
          <div className="grid2">
            {columns.map(col => {
              const id = `${helpPrefix}-${i}-${col.key}`;
              return (
                <div className="field" key={col.key}>
                  <span className="field-label" id={`${id}-label`}>
                    <FieldTerm helpKey={repeaterHelpKey(helpPrefix, col.key)} metaKey={col.key} label={col.label} />{' '}
                    <MetaBadges fieldKey={col.key} />
                  </span>
                  <input
                    id={id}
                    aria-labelledby={`${id}-label`}
                    value={row[col.key]}
                    onChange={e => setCell(i, col.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-primary" onClick={onAdd}>
        {addLabel}
      </button>
    </>
  );
}
