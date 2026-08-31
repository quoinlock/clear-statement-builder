// The three repeater panels with Hugo's column labels (parity).
import { useAppStore } from '../app/store.tsx';
import { Repeater } from './Repeater.tsx';
import type { ProductRow, ReserveRow, SublicenseRow } from '../../core/types.ts';

const PRODUCT_COLUMNS = [
  { key: 'form', label: 'Product Form Detail' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'pubDate', label: 'Publication Date' },
  { key: 'listPrice', label: 'List Price' },
  { key: 'basis', label: 'Royalty Basis' },
  { key: 'rate', label: 'Royalty Rate %' },
  { key: 'priorUnits', label: 'Prior Units' },
  { key: 'periodUnits', label: 'Units Sold in Period' },
  { key: 'basisAmount', label: 'Royalty Basis Amount' },
  { key: 'earnings', label: 'Royalty Earnings' },
] as const;

const RESERVE_COLUMNS = [
  { key: 'form', label: 'Product Form Detail' },
  { key: 'rate', label: 'Reserve Rate' },
  { key: 'withheld', label: 'Reserve Withheld' },
  { key: 'released', label: 'Reserve Released' },
] as const;

const SUBLICENSE_COLUMNS = [
  { key: 'name', label: 'Sublicensee Name' },
  { key: 'type', label: 'Sublicense Type' },
  { key: 'income', label: 'Sublicense Income' },
  { key: 'share', label: 'Licensor Share %' },
  { key: 'amountDue', label: 'Licensor Amount Due' },
] as const;

export function ProductRows() {
  const store = useAppStore();
  return (
    <Repeater<ProductRow>
      title="Product rows"
      subtitle="One row per product form (Hardcover, Paperback, E-Book, ...)."
      rows={store.workspace.products}
      columns={[...PRODUCT_COLUMNS]}
      addLabel="Add product row"
      onChange={store.setProducts}
      onAdd={store.addProduct}
    />
  );
}

export function ReserveRows() {
  const store = useAppStore();
  return (
    <Repeater<ReserveRow>
      title="Reserve rows"
      subtitle="Reserves withheld against returns and releases of prior reserves."
      rows={store.workspace.reserves}
      columns={[...RESERVE_COLUMNS]}
      addLabel="Add reserve row"
      onChange={store.setReserves}
      onAdd={store.addReserve}
    />
  );
}

export function SublicenseRows() {
  const store = useAppStore();
  return (
    <Repeater<SublicenseRow>
      title="Sublicense rows"
      subtitle="Subsidiary rights income detail, when applicable."
      rows={store.workspace.sublicenses}
      columns={[...SUBLICENSE_COLUMNS]}
      addLabel="Add sublicense row"
      onChange={store.setSublicenses}
      onAdd={store.addSublicense}
    />
  );
}
