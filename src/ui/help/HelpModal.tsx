// F9: Help Center modal — role=dialog aria-modal, eight tabs, Escape and
// backdrop close, focus returned to the opener. Opens on the app bar's
// csb:open-help event.
import { useEffect, useRef, useState } from 'react';
import { HELP_SECTIONS } from './helpContent.tsx';

export function HelpModal() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(HELP_SECTIONS[0].id);
  const openerRef = useRef<Element | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOpen() {
      openerRef.current = document.activeElement;
      setOpen(true);
    }
    document.addEventListener('csb:open-help', onOpen);
    return () => document.removeEventListener('csb:open-help', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
  }

  if (!open) return null;
  const active = HELP_SECTIONS.find(s => s.id === section) ?? HELP_SECTIONS[0];

  return (
    <div className="help-backdrop no-print" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        className="help-window"
        onClick={e => e.stopPropagation()}
      >
        <div className="help-head">
          <h2 id="help-title">Help Center</h2>
          <button type="button" className="btn small" onClick={close}>
            Close
          </button>
        </div>
        <div className="help-body">
          <nav className="help-nav" aria-label="Help sections">
            {HELP_SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                className="nav-item"
                aria-current={s.id === active.id ? 'page' : undefined}
                onClick={() => setSection(s.id)}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <div className="help-content">
            <h3>{active.title}</h3>
            {active.body}
          </div>
        </div>
      </div>
    </div>
  );
}
