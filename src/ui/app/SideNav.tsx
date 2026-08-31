import { SECTIONS, useAppStore } from './store.tsx';

export function SideNav() {
  const { section, setSection } = useAppStore();
  return (
    <nav className="side-nav no-print" aria-label="Sections">
      {SECTIONS.map(name => (
        <button
          key={name}
          type="button"
          className="nav-item"
          aria-current={section === name ? 'page' : undefined}
          onClick={() => setSection(name)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}
