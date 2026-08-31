// Generic repeater: card per row ("Row N" + Delete), two-column field grid,
// zero rows allowed (parity).
import { MetaBadges } from './Badges.tsx';

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
  onChange,
  onAdd,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  columns: RepeaterColumn<T>[];
  addLabel: string;
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
            {columns.map(col => (
              <div className="field" key={col.key}>
                <label>
                  {col.label} <MetaBadges fieldKey={col.key} />
                  <input value={row[col.key]} onChange={e => setCell(i, col.key, e.target.value)} />
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-primary" onClick={onAdd}>
        {addLabel}
      </button>
    </>
  );
}
