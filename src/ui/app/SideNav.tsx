// Layout A: the ten sections grouped into Build / Check / Import, with row
// counts on the repeater sections; About, Version history, and Help sit in
// the rail footer under the tagline.
import { TAGLINE } from '../brand.ts';
import { useAppStore, type Section } from './store.tsx';

interface NavEntry {
  section: Section;
  label: string;
  icon: string; // key into ICONS
}

interface NavGroup {
  heading: string;
  entries: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Build',
    entries: [
      { section: 'Statement data', label: 'Statement', icon: 'file' },
      { section: 'Product rows', label: 'Products', icon: 'table' },
      { section: 'Reserve rows', label: 'Reserves', icon: 'shield' },
      { section: 'Sublicense rows', label: 'Sublicenses', icon: 'list' },
    ],
  },
  {
    heading: 'Check',
    entries: [
      { section: 'Validation', label: 'Validation', icon: 'check' },
      { section: 'Review my statement', label: 'Review', icon: 'search' },
    ],
  },
  {
    heading: 'Import',
    entries: [
      { section: 'Import / digest', label: 'Import / digest', icon: 'download' },
      { section: 'Custom import profiles', label: 'Custom profiles', icon: 'sliders' },
    ],
  },
];

export const NAV_FOOTER: NavEntry[] = [
  { section: 'About', label: 'About', icon: '' },
  { section: 'Version history', label: 'Version history', icon: '' },
];

const ICONS: Record<string, string> = {
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6',
  table: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M9 4v16',
  shield: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z',
  list: 'M4 7h16M4 12h10M4 17h7',
  check: 'M20 6L9 17l-5-5',
  search: 'M17 17l4 4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  download: 'M12 3v12M6 9l6 6 6-6M4 20h16',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M6 10v4M16 16v4',
};

function Icon({ name }: { name: string }) {
  return (
    <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function SideNav() {
  const { section, setSection, workspace } = useAppStore();
  const counts: Partial<Record<Section, number>> = {
    'Product rows': workspace.products.length,
    'Reserve rows': workspace.reserves.length,
    'Sublicense rows': workspace.sublicenses.length,
  };

  function item(entry: NavEntry, compact = false) {
    const count = counts[entry.section];
    return (
      <button
        key={entry.section}
        type="button"
        className={compact ? 'nav-footer-item' : 'nav-item'}
        aria-current={section === entry.section ? 'page' : undefined}
        onClick={() => setSection(entry.section)}
      >
        {entry.icon ? <Icon name={entry.icon} /> : null}
        <span className="nav-label">{entry.label}</span>
        {count !== undefined ? (
          <span className="nav-count" aria-label={`${count} rows`}>
            {count}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <nav className="side-nav no-print" aria-label="Sections">
      {NAV_GROUPS.map(group => (
        <div className="nav-group" key={group.heading}>
          <div className="nav-heading">{group.heading}</div>
          {group.entries.map(e => item(e))}
        </div>
      ))}
      <div className="nav-footer">
        <div className="nav-footer-links">
          {NAV_FOOTER.map(e => item(e, true))}
          <button
            type="button"
            className="nav-footer-item"
            onClick={() => document.dispatchEvent(new CustomEvent('csb:open-help'))}
          >
            Help
          </button>
        </div>
        <p className="nav-tagline">{TAGLINE}</p>
      </div>
    </nav>
  );
}
