// Field-level help: every data-entry label is a button that opens a small
// dialog explaining the field in the BISG TRRSS and in plain publisher
// terms (copy in core/catalog/fieldHelp.ts). Same open/close contract as
// the Help Center: a document event opens it; Escape, the backdrop, and the
// Close button dismiss it; focus returns to the label that opened it.
import { useEffect, useRef, useState } from 'react';
import { fieldHelp } from '../../core/catalog/fieldHelp.ts';
import { MetaBadges } from './Badges.tsx';

const OPEN_EVENT = 'csb:open-field-help';

export interface FieldHelpRequest {
  /** Key into FIELD_HELP (namespaced for repeater columns). */
  helpKey: string;
  /** Key into FIELD_META for the category/ID badges (bare column key). */
  metaKey: string;
  /** Label as displayed, after any statement-type override. */
  label: string;
}

export function openFieldHelp(request: FieldHelpRequest) {
  document.dispatchEvent(new CustomEvent<FieldHelpRequest>(OPEN_EVENT, { detail: request }));
}

/** Clickable label text. Falls back to plain text if no help copy exists. */
export function FieldTerm({ helpKey, metaKey, label }: FieldHelpRequest) {
  if (!fieldHelp(helpKey)) return <>{label}</>;
  return (
    <button
      type="button"
      className="field-term"
      aria-haspopup="dialog"
      title={`What "${label}" means`}
      onClick={() => openFieldHelp({ helpKey, metaKey, label })}
    >
      {label}
    </button>
  );
}

export function FieldHelpModal() {
  const [request, setRequest] = useState<FieldHelpRequest | null>(null);
  const openerRef = useRef<Element | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      openerRef.current = document.activeElement;
      setRequest((e as CustomEvent<FieldHelpRequest>).detail);
    }
    document.addEventListener(OPEN_EVENT, onOpen);
    return () => document.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!request) return;
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  function close() {
    setRequest(null);
    if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
  }

  if (!request) return null;
  const help = fieldHelp(request.helpKey);
  if (!help) return null;

  return (
    <div className="help-backdrop no-print" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-help-title"
        tabIndex={-1}
        className="help-window field-help-window"
        onClick={e => e.stopPropagation()}
      >
        <div className="help-head">
          <div>
            <h2 id="field-help-title">{request.label}</h2>
            <div className="field-help-badges">
              <MetaBadges fieldKey={request.metaKey} />
            </div>
          </div>
          <button type="button" className="btn small" onClick={close}>
            Close
          </button>
        </div>
        <div className="field-help-body">
          <h3>In the BISG standard (TRRSS)</h3>
          <p>{help.standard}</p>
          <h3>What it means for publishers</h3>
          <p>{help.plain}</p>
          <p className="field-help-note">
            Standard text is paraphrased from the field list of the BISG Translation Rights Royalty Statement
            Standard. Consult the published standard for authoritative definitions. This is not BISG
            certification.
          </p>
        </div>
      </div>
    </div>
  );
}
