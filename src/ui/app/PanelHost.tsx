// Hosts the currently selected sidebar panel (one visible at a time, Hugo
// parity). Panels are filled in across PR 8-18; unbuilt ones render a stub.
import { useAppStore, type Section } from './store.tsx';
import { StatementForms } from '../statement/StatementForms.tsx';
import { ProductRows, ReserveRows, SublicenseRows } from '../statement/RepeaterPanels.tsx';
import { ValidationPanel } from '../validation/ValidationPanel.tsx';
import { ReviewPanel } from '../review/ReviewPanel.tsx';
import { ImportPanel } from '../import/ImportPanel.tsx';
import type { ComponentType } from 'react';

function Stub({ name }: { name: string }) {
  return (
    <>
      <h2>{name}</h2>
      <p className="panel-sub">This section is under construction.</p>
    </>
  );
}

const PANELS: Partial<Record<Section, ComponentType>> = {
  'Statement data': StatementForms,
  'Product rows': ProductRows,
  'Reserve rows': ReserveRows,
  'Sublicense rows': SublicenseRows,
  Validation: ValidationPanel,
  'Review my statement': ReviewPanel,
  'Import / digest': ImportPanel,
};

export function PanelHost() {
  const { section } = useAppStore();
  const Panel = PANELS[section];
  return (
    <section className="panel no-print" aria-label={section}>
      {Panel ? <Panel /> : <Stub name={section} />}
    </section>
  );
}
